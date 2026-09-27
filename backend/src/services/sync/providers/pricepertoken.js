/**
 * Price Per Token MCP Adapter
 * 
 * Connects to the Price Per Token MCP server at:
 *   https://api.pricepertoken.com/mcp/mcp
 * 
 * No API key required. Free public endpoint.
 * 
 * Uses the Model Context Protocol (MCP) over HTTP+SSE transport.
 * Deterministic fetch — NO LLM involved.
 * 
 * MCP Tools used:
 *   - get_providers   → list all available providers
 *   - get_all_models  → list all models with pricing
 * 
 * Returns normalized records with source_type = 'pricepertoken'
 */

import crypto from 'node:crypto';

const MCP_ENDPOINT = 'https://api.pricepertoken.com/mcp/mcp';
const SOURCE_TYPE = 'pricepertoken';
const SOURCE_NAME = 'Price Per Token MCP';

/**
 * Low-level MCP JSON-RPC over HTTP.
 * 
 * MCP protocol sends a POST with Content-Type: application/json.
 * The server responds with either JSON or SSE stream.
 * We use the stateless HTTP mode (no session required for these public tools).
 */
async function mcpCall(method, params = {}, sessionId = null) {
  const requestId = crypto.randomUUID();
  
  const body = JSON.stringify({
    jsonrpc: '2.0',
    id: requestId,
    method,
    params,
  });

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'User-Agent': 'ordisum-pricepertoken-sync/1.0',
  };

  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const res = await fetch(MCP_ENDPOINT, {
    method: 'POST',
    headers,
    body,
    signal: AbortSignal.timeout(30_000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`MCP HTTP error ${res.status}: ${errText.slice(0, 300)}`);
  }

  const contentType = res.headers.get('content-type') || '';
  
  // Handle SSE streaming response
  if (contentType.includes('text/event-stream')) {
    return await parseSseResponse(res);
  }

  // Handle plain JSON response
  const json = await res.json();

  if (json.error) {
    throw new Error(`MCP error ${json.error.code}: ${json.error.message}`);
  }

  return json.result;
}

/**
 * Parse Server-Sent Events (SSE) stream from MCP endpoint.
 * Collects all events and returns the final result message.
 */
async function parseSseResponse(res) {
  const text = await res.text();
  const lines = text.split('\n');
  let lastResult = null;

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      try {
        const data = JSON.parse(line.slice(6));
        if (data.result !== undefined) {
          lastResult = data.result;
        }
        if (data.error) {
          throw new Error(`MCP SSE error: ${data.error.message}`);
        }
      } catch (parseErr) {
        if (parseErr.message.startsWith('MCP SSE error:')) throw parseErr;
        // Silently skip non-JSON SSE events
      }
    }
  }

  return lastResult;
}

/**
 * Initialize MCP session (required for some MCP servers).
 * Returns sessionId or null if not needed.
 */
async function initializeSession() {
  try {
    const result = await mcpCall('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'ordisum',
        version: '1.0.0',
      },
    });
    
    // Session ID may be returned in headers — for now use null (stateless)
    return null;
  } catch (err) {
    // Some MCP servers don't require initialization
    console.warn('[PricePerToken] Session init skipped:', err.message);
    return null;
  }
}

/**
 * Call a specific MCP tool.
 */
async function callTool(toolName, toolArgs = {}, sessionId = null) {
  return mcpCall('tools/call', {
    name: toolName,
    arguments: toolArgs,
  }, sessionId);
}

/**
 * Normalize a single model record from PricePerToken MCP format.
 * 
 * PricePerToken typically returns prices per million tokens.
 * We convert to per 1K for storage consistency with the DB schema.
 */
function normalizeModel(raw, sourceUrl) {
  if (!raw || typeof raw !== 'object') return null;

  // Extract provider and model IDs
  // PricePerToken uses various field names depending on tool
  const provider = (raw.provider_id || raw.provider || raw.providerId || '').toLowerCase().trim();
  const modelId = (raw.model_id || raw.id || raw.model || raw.modelId || '').trim();

  if (!provider || !modelId) return null;

  // Price extraction — PricePerToken uses USD per million tokens
  // Convert to USD per 1K tokens (÷ 1000)
  const inputPer1m = extractNumeric(
    raw.input_cost || raw.input_price || raw.prompt_cost || 
    raw.cost_per_million_input_tokens || raw.input
  );
  const outputPer1m = extractNumeric(
    raw.output_cost || raw.output_price || raw.completion_cost || 
    raw.cost_per_million_output_tokens || raw.output
  );

  const inputPer1k = inputPer1m !== null ? inputPer1m / 1000 : null;
  const outputPer1k = outputPer1m !== null ? outputPer1m / 1000 : null;

  return {
    provider,
    model_id: modelId,
    input_cost_per_1k: inputPer1k,
    output_cost_per_1k: outputPer1k,
    context_window: raw.context_window || raw.max_tokens || raw.context_length || null,
    source_type: SOURCE_TYPE,
    source_name: SOURCE_NAME,
    source_url: sourceUrl || MCP_ENDPOINT,
    raw, // preserve original for debugging
  };
}

/**
 * Extract a numeric value from various possible field types.
 */
function extractNumeric(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

/**
 * Main export: fetch all models from PricePerToken MCP.
 * 
 * This is the primary entry point used by importEngine.js.
 * 
 * Returns an array of normalized model records.
 * Never throws silently — errors propagate to caller.
 */
export async function fetchModels() {
  console.log('[PricePerToken] Initializing MCP connection...');
  
  const sessionId = await initializeSession();

  console.log('[PricePerToken] Fetching all models via get_all_models tool...');
  
  let toolResult;
  try {
    toolResult = await callTool('get_all_models', {}, sessionId);
  } catch (err) {
    throw new Error(`PricePerToken MCP tool call failed: ${err.message}`);
  }

  // The result is wrapped in MCP content format
  // content[0].text contains the JSON string of actual data
  let models = [];
  
  if (toolResult && Array.isArray(toolResult.content)) {
    for (const content of toolResult.content) {
      if (content.type === 'text' && content.text) {
        try {
          const parsed = JSON.parse(content.text);
          // The data could be an array directly, or { models: [...] }, or { data: [...] }
          if (Array.isArray(parsed)) {
            models = parsed;
          } else if (Array.isArray(parsed.models)) {
            models = parsed.models;
          } else if (Array.isArray(parsed.data)) {
            models = parsed.data;
          }
        } catch {
          // Not JSON — skip
        }
      }
    }
  } else if (Array.isArray(toolResult)) {
    models = toolResult;
  }

  console.log(`[PricePerToken] Raw models received: ${models.length}`);

  // Normalize all models
  const normalized = [];
  const seenKeys = new Set();
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const raw of models) {
    const record = normalizeModel(raw, MCP_ENDPOINT);
    
    if (!record) {
      invalidCount++;
      continue;
    }

    // Deduplicate within this fetch (same provider+model from same source)
    const key = `${record.provider}:${record.model_id}`;
    if (seenKeys.has(key)) {
      duplicateCount++;
      continue;
    }
    seenKeys.add(key);

    normalized.push(record);
  }

  console.log(`[PricePerToken] Normalized: ${normalized.length} | Invalid: ${invalidCount} | Duplicates within fetch: ${duplicateCount}`);

  return normalized;
}

/**
 * Fetch specific provider models via get_provider_slugs + get_model tools.
 * Used for targeted syncs of specific providers.
 */
export async function fetchProviders() {
  const sessionId = await initializeSession();
  
  let toolResult;
  try {
    toolResult = await callTool('get_providers', {}, sessionId);
  } catch (err) {
    throw new Error(`PricePerToken get_providers failed: ${err.message}`);
  }

  let providers = [];
  
  if (toolResult && Array.isArray(toolResult.content)) {
    for (const content of toolResult.content) {
      if (content.type === 'text' && content.text) {
        try {
          const parsed = JSON.parse(content.text);
          if (Array.isArray(parsed)) providers = parsed;
          else if (Array.isArray(parsed.providers)) providers = parsed.providers;
          else if (Array.isArray(parsed.data)) providers = parsed.data;
        } catch { }
      }
    }
  } else if (Array.isArray(toolResult)) {
    providers = toolResult;
  }

  return providers;
}

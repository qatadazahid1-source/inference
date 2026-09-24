/**
 * OpenRouter HTTP Fetcher
 *
 * Fetches the raw model list from https://openrouter.ai/api/v1/models
 *
 * Environment variables:
 *   OPENROUTER_API_KEY          - Optional. Bearer token if endpoint requires auth in the future.
 *   OPENROUTER_SYNC_TIMEOUT_MS  - Request timeout in ms. Default: 30000
 */

const API_URL = 'https://openrouter.ai/api/v1/models';
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * Fetches raw model objects from the OpenRouter API.
 * @returns {Promise<object[]>} Array of raw model objects from the API.
 * @throws {Error} On network failure, timeout, HTTP error, or unexpected response structure.
 */
export async function fetchOpenRouterModels() {
  const timeoutMs = parseInt(process.env.OPENROUTER_SYNC_TIMEOUT_MS || String(DEFAULT_TIMEOUT_MS), 10);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'ordisum-sync/1.0',
  };

  // Optional API key — never hardcoded
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  let response;
  try {
    response = await fetch(API_URL, { signal: controller.signal, headers });
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw new Error(`Network error: ${err.message}`);
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText} from ${API_URL}`);
  }

  let json;
  try {
    json = await response.json();
  } catch (err) {
    throw new Error(`Failed to parse JSON response: ${err.message}`);
  }

  // Validate response structure
  if (!json || typeof json !== 'object') {
    throw new Error('Unexpected response: root is not an object');
  }
  if (!Array.isArray(json.data)) {
    throw new Error('Unexpected response: missing "data" array. Response keys: ' + Object.keys(json).join(', '));
  }
  if (json.data.length === 0) {
    throw new Error('API returned an empty models array — refusing to proceed to avoid data loss');
  }

  return json.data;
}

import axios from 'axios';
import { supabase } from '../index.js';
import { getDecryptedApiKey } from '../utils/encryption.js';
import { getPricingForModel } from '../utils/pricingHelper.js';
import { calculateCost } from '../utils/costCalculator.js';
import { checkBudgetThresholds } from '../utils/alertHelper.js';

// Returns the start of the given budget's current period, as an ISO string,
// so spend-so-far can be summed against the right window. Each budget
// chooses its own period (monthly/quarterly/annual) when created — this
// respects that instead of assuming "daily" for every budget.
function getPeriodStart(period, now) {
  if (period === 'quarterly') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1).toISOString();
  }
  if (period === 'annual') {
    return new Date(now.getFullYear(), 0, 1).toISOString();
  }
  // Default / 'monthly'
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

// Enforcement check — called BEFORE the AI provider is ever hit. If any
// hard_limit=true budget for this org has already had its current-period
// spend reach or exceed its total_budget, the request is blocked entirely
// (no provider call, no cost incurred). This is intentionally org-wide,
// not scoped to a specific provider/model — budgets.scope is free text
// without structured backing (same situation as alert_rules.scope), so a
// safety-blocking feature is kept simple and unambiguous rather than
// guessing at partial matches.
//
// Returns null if nothing is blocked, or { budgetName, spend, limit } if
// the request should be blocked.
async function checkHardLimits(organization_id) {
  const { data: budgets, error } = await supabase
    .from('budgets')
    .select('id, name, total_budget, period')
    .eq('organization_id', organization_id)
    .eq('hard_limit', true);

  if (error) {
    console.error('[aiGateway] checkHardLimits budgets fetch error:', error.message);
    return null; // fail open — a DB error here shouldn't itself block all traffic
  }
  if (!budgets || budgets.length === 0) return null;

  const now = new Date();

  for (const budget of budgets) {
    const periodStart = getPeriodStart(budget.period, now);

    const { data: logs, error: logsError } = await supabase
      .from('api_usage_logs')
      .select('cost_usd')
      .eq('organization_id', organization_id)
      .gte('logged_at', periodStart);

    if (logsError) {
      console.error('[aiGateway] checkHardLimits logs fetch error:', logsError.message);
      continue; // skip this budget rather than blocking on incomplete data
    }

    const spend = (logs || []).reduce((acc, r) => acc + Number(r.cost_usd || 0), 0);

    if (spend >= Number(budget.total_budget)) {
      return { budgetName: budget.name, spend, limit: Number(budget.total_budget) };
    }
  }

  return null;
}

// Calls the right AI provider, calculates cost, and logs the usage row.
// This is the exact logic that used to live inline in proxy.js's
// handleProxyRequest — moved here unchanged so both the internal Playground
// proxy (/api/proxy/chat) and the new external gateway (/v1/chat/completions)
// can share it instead of duplicating it.
//
// Params:
//   organization_id, integration_id  — already resolved by the caller
//   provider, model, messages        — same shape proxy.js always used
//   source                           — 'playground' | 'external_api', stored
//                                       in api_usage_logs.metadata so the
//                                       dashboard can tell the two apart
//   platform_key_id                  — optional, only set when source is
//                                       'external_api'
//
// Returns: { responseText, inputTokens, outputTokens, totalTokens, cost_usd, latencyMs }
// Throws an error shaped like axios errors (err.response.status/data) on
// provider failures, exactly like the original inline code did, so existing
// callers' error handling keeps working unchanged.
export async function callProviderAndLog({
  organization_id,
  integration_id,
  provider,
  model,
  messages,
  source,
  platform_key_id = null,
}) {
  const startMs = Date.now();
  const normalizedMessages = messages;

  // 0. Enforcement: block before any provider call or cost is incurred if
  // a hard_limit budget has already been exceeded for its current period.
  const blockResult = await checkHardLimits(organization_id);
  if (blockResult) {
    // Log the block itself (status='blocked', cost=0) so the org can see
    // in their history how often requests are being rejected, not just
    // get a one-off error with no record of it.
    const metadata = platform_key_id
      ? { source, platform_key_id, blocked_budget: blockResult.budgetName }
      : { source, blocked_budget: blockResult.budgetName };

    const { error: blockLogError } = await supabase
      .from('api_usage_logs')
      .insert({
        organization_id,
        integration_id,
        provider,
        model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        latency_ms: Date.now() - startMs,
        status: 'blocked',
        metadata,
        logged_at: new Date().toISOString()
      });

    if (blockLogError) {
      console.error('[aiGateway] Blocked-request log insert error:', blockLogError.message, blockLogError);
    }

    const err = new Error(
      `Request blocked: the "${blockResult.budgetName}" budget limit has been reached ($${blockResult.spend.toFixed(2)} of $${blockResult.limit.toFixed(2)}).`
    );
    err.isBudgetBlocked = true;
    throw err;
  }

  // 0b. Enforcement: block before any provider call if this model has no
  // pricing configured in the Admin Panel. Without this, a call would
  // succeed against the real provider (real cost incurred there) while our
  // own cost_usd would either silently guess wrong or come out as $0 —
  // both mean the customer's dashboard shows incorrect billing. Better to
  // fail loud here than mis-bill silently.
  const pricing = await getPricingForModel(provider, model);
  if (!pricing) {
    const metadata = platform_key_id ? { source, platform_key_id } : { source };

    const { error: unpricedLogError } = await supabase
      .from('api_usage_logs')
      .insert({
        organization_id,
        integration_id,
        provider,
        model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        latency_ms: Date.now() - startMs,
        status: 'blocked',
        error_message: `No pricing configured for ${provider}/${model}`,
        metadata,
        logged_at: new Date().toISOString()
      });

    if (unpricedLogError) {
      console.error('[aiGateway] Unpriced-model log insert error:', unpricedLogError.message, unpricedLogError);
    }

    const err = new Error(
      `This model ("${model}" on ${provider}) is not yet configured for billing. Ask a platform admin to add its pricing in the Admin Panel (Pricing Management) before it can be used.`
    );
    err.isUnpricedModel = true;
    throw err;
  }

  // 1. Decrypt the API key and call the AI provider — both wrapped in the
  // same try/catch so either kind of failure gets logged the same way.
  let apiKey;
  let responseText = '';
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    // Decrypt the API key — never log or return it
    apiKey = await getDecryptedApiKey(integration_id, organization_id);

    if (provider === 'openai' || provider === 'azure') {
      const endpoint = provider === 'azure'
        ? `https://${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${model}/chat/completions?api-version=2024-02-01`
        : 'https://api.openai.com/v1/chat/completions';

      const headers = provider === 'azure'
        ? { 'api-key': apiKey, 'Content-Type': 'application/json' }
        : { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' };

      const aiRes = await axios.post(endpoint, { model, messages: normalizedMessages }, { headers, timeout: 60000 });

      responseText = aiRes.data.choices?.[0]?.message?.content ?? '';
      inputTokens = aiRes.data.usage?.prompt_tokens ?? 0;
      outputTokens = aiRes.data.usage?.completion_tokens ?? 0;

    } else if (provider === 'anthropic') {
      const aiRes = await axios.post(
        'https://api.anthropic.com/v1/messages',
        {
          model,
          max_tokens: 1024,
          messages: normalizedMessages.filter(m => m.role !== 'system'),
          system: normalizedMessages.find(m => m.role === 'system')?.content
        },
        {
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      responseText = aiRes.data.content?.[0]?.text ?? '';
      inputTokens = aiRes.data.usage?.input_tokens ?? 0;
      outputTokens = aiRes.data.usage?.output_tokens ?? 0;

    } else if (provider === 'google') {
      const geminiModel = model.startsWith('models/') ? model : `models/${model}`;
      const aiRes = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/${geminiModel}:generateContent?key=${apiKey}`,
        {
          contents: normalizedMessages.map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
          }))
        },
        { headers: { 'Content-Type': 'application/json' }, timeout: 60000 }
      );

      responseText = aiRes.data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      inputTokens = aiRes.data.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = aiRes.data.usageMetadata?.candidatesTokenCount ?? 0;

    } else if (provider === 'groq') {
      const aiRes = await axios.post(
        'https://api.groq.com/openai/v1/chat/completions',
        { model, messages: normalizedMessages },
        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 30000 }
      );

      responseText = aiRes.data.choices?.[0]?.message?.content ?? '';
      inputTokens = aiRes.data.usage?.prompt_tokens ?? 0;
      outputTokens = aiRes.data.usage?.completion_tokens ?? 0;

    } else if (provider === 'mistral') {
      const aiRes = await axios.post(
        'https://api.mistral.ai/v1/chat/completions',
        { model, messages: normalizedMessages },
        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
      );

      responseText = aiRes.data.choices?.[0]?.message?.content ?? '';
      inputTokens = aiRes.data.usage?.prompt_tokens ?? 0;
      outputTokens = aiRes.data.usage?.completion_tokens ?? 0;

    } else if (provider === 'cohere') {
      const lastUserMsg = [...normalizedMessages].reverse().find(m => m.role === 'user');
      const chatHistory = normalizedMessages.slice(0, -1).map(m => ({
        role: m.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: m.content
      }));

      const aiRes = await axios.post(
        'https://api.cohere.ai/v1/chat',
        { model, message: lastUserMsg?.content ?? '', chat_history: chatHistory },
        { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 }
      );

      responseText = aiRes.data.text ?? '';
      inputTokens = aiRes.data.meta?.tokens?.input_tokens ?? 0;
      outputTokens = aiRes.data.meta?.tokens?.output_tokens ?? 0;

    } else {
      // Caller is responsible for translating this into the right HTTP
      // response shape for its own API contract (internal vs OpenAI-style).
      const err = new Error(`Provider '${provider}' is not yet implemented.`);
      err.isUnsupportedProvider = true;
      throw err;
    }

  } catch (err) {
    // Failure/Error Cost Rule: a failed request still gets a row in
    // api_usage_logs (status='failed', cost=0, 0 tokens) instead of
    // disappearing silently. This is what makes failure-rate visible on the
    // dashboard and is the data source for the future Error Alert. We log
    // here and then re-throw unchanged, so proxy.js / v1.js's existing
    // error-handling (status codes, error-shape translation) is untouched.
    const latencyMs = Date.now() - startMs;
    const metadata = platform_key_id ? { source, platform_key_id } : { source };

    const { error: logError } = await supabase
      .from('api_usage_logs')
      .insert({
        organization_id,
        integration_id,
        provider,
        model,
        input_tokens: 0,
        output_tokens: 0,
        total_tokens: 0,
        cost_usd: 0,
        latency_ms: latencyMs,
        status: 'failed',
        metadata,
        logged_at: new Date().toISOString()
      });

    if (logError) {
      console.error('[aiGateway] Failed-request log insert error:', logError.message, logError);
    }

    throw err;
  }

  const latencyMs = Date.now() - startMs;
  const totalTokens = inputTokens + outputTokens;

  // 3. Calculate cost — reuse the pricing we already validated exists
  // before calling the provider (see step 0b above); no need to re-query.
  const cost_usd = calculateCost({ inputTokens, outputTokens, pricing });

  // 4. Log usage — same table, now tagged with where the request came from
  const metadata = platform_key_id ? { source, platform_key_id } : { source };

  const { error: logError } = await supabase
    .from('api_usage_logs')
    .insert({
      organization_id,
      integration_id,
      provider,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      total_tokens: totalTokens,
      cost_usd,
      latency_ms: latencyMs,
      status: 'success',
      metadata,
      logged_at: new Date().toISOString()
    });

  if (logError) {
    console.error('[aiGateway] Usage log insert error:', logError.message, logError);
  }

  // 5. Async budget threshold check (fire-and-forget, don't block response)
  checkBudgetThresholds(organization_id, cost_usd).catch(err =>
    console.error('[aiGateway] Budget check error:', err.message)
  );

  return { responseText, inputTokens, outputTokens, totalTokens, cost_usd, latencyMs };
}

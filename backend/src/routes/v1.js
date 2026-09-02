import express from 'express';
import crypto from 'crypto';
import { supabase } from '../index.js';
import { callProviderAndLog } from '../services/aiGateway.js';
import { attachEntitlements, checkModelAndSpendEntitlement } from '../middleware/requireEntitlements.js';

const router = express.Router();

// POST /v1/chat/completions
//
// This is the "front door" for external code — anyone's own server, script,
// or app can point an OpenAI-compatible SDK at this URL using a Platform Key
// (ii_sk_live_...) instead of a Supabase session. Auth happens via
// requirePlatformKey (see index.js), which already resolved req.platformKey
// = { id, organization_id, integration_id } before this handler runs.
//
// Request/response shapes follow the OpenAI chat completions contract so
// existing OpenAI SDK code works against this endpoint with just a
// base_url + api_key swap — no code changes needed on the caller's side.
router.post('/chat/completions', async (req, res) => {
  const { model, messages } = req.body;
  const { id: platform_key_id, organization_id, integration_id } = req.platformKey;

  if (!model) {
    return res.status(400).json({ error: { message: "'model' is required.", type: 'invalid_request_error' } });
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: { message: "'messages' must be a non-empty array.", type: 'invalid_request_error' } });
  }

  try {
    // The platform key is tied to one specific integration (and therefore
    // one specific provider) at creation time — that's the whole point of
    // the "Activate" flow on the Integrations page. Look up the provider
    // here rather than trusting anything from the request body.
    const { data: integration, error: intError } = await supabase
      .from('ai_integrations')
      .select('id, provider, status')
      .eq('id', integration_id)
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (intError || !integration) {
      return res.status(400).json({ error: { message: 'The integration behind this API key no longer exists.', type: 'invalid_request_error' } });
    }
    if (integration.status !== 'active') {
      return res.status(400).json({ error: { message: 'The integration behind this API key is not active.', type: 'invalid_request_error' } });
    }

    // ── Plan Entitlement Enforcement ───────────────────────────────────────
    // Shared with the internal dashboard Playground (proxy.js) via
    // checkModelAndSpendEntitlement — see middleware/requireEntitlements.js.
    // Throws isEntitlementModelNotAllowed / isBudgetBlocked, caught below.
    await checkModelAndSpendEntitlement({
      supabase,
      organization_id,
      provider: integration.provider,
      model,
    });
    // ── End Plan Entitlement Enforcement ───────────────────────────────────

    const { responseText, inputTokens, outputTokens, totalTokens } = await callProviderAndLog({
      organization_id,
      integration_id: integration.id,
      provider: integration.provider,
      model,
      messages,
      source: 'external_api',
      platform_key_id,
    });

    // Fire-and-forget: record that this key was just used. Doesn't block
    // the response, and a failure here shouldn't fail the request.
    supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', platform_key_id)
      .then(() => {})
      .catch((err) => console.error('[v1] last_used_at update failed:', err.message));

    return res.json({
      id: `chatcmpl-${crypto.randomBytes(12).toString('hex')}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model,
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: responseText },
          finish_reason: 'stop',
        },
      ],
      usage: {
        prompt_tokens: inputTokens,
        completion_tokens: outputTokens,
        total_tokens: totalTokens,
      },
    });

  } catch (err) {
    console.error('[v1] Error:', err.message, err.response?.data ?? '');

    if (err.isUnsupportedProvider) {
      return res.status(400).json({ error: { message: err.message, type: 'invalid_request_error' } });
    }

    if (err.isBudgetBlocked) {
      return res.status(403).json({ error: { message: err.message, type: 'budget_exceeded' } });
    }

    if (err.isEntitlementModelNotAllowed) {
      return res.status(403).json({ error: { message: err.message, type: 'ENTITLEMENT_MODEL_NOT_ALLOWED' } });
    }

    if (err.isUnpricedModel) {
      return res.status(422).json({ error: { message: err.message, type: 'model_not_priced' } });
    }

    // Provider errors (4xx/5xx from the AI API) — same OpenAI-shaped error
    // envelope so SDK error handling on the caller's side keeps working.
    if (err.response) {
      const status = err.response.status;
      const providerMsg = err.response.data?.error?.message
        ?? err.response.data?.message
        ?? 'Provider returned an error.';
      return res.status(status >= 400 && status < 600 ? status : 502).json({
        error: { message: providerMsg, type: 'provider_error' },
      });
    }

    return res.status(500).json({
      error: { message: err.message || 'Request failed.', type: 'internal_error' },
    });
  }
});

export default router;

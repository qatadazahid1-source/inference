import express from 'express';
import { supabase } from '../index.js';
import { callProviderAndLog } from '../services/aiGateway.js';
import { attachEntitlements, checkModelAndSpendEntitlement } from '../middleware/requireEntitlements.js';

const router = express.Router();

// Helper: resolve organization_id server-side from JWT
async function getUserOrgId(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    // Fallback: check organizations table with user_id column
    const { data: org } = await supabase
      .from('organizations')
      .select('id')
      .eq('user_id', userId)
      .limit(1)
      .maybeSingle();
    if (org) return org.id;
    throw new Error(`No active organization found for user ${userId}`);
  }
  return data.organization_id;
}

// Route: POST /api/proxy/chat  (canonical)
// Route: POST /api/proxy/generate  (legacy alias)
//
// All provider-calling, cost-calculation, and usage-logging logic now lives
// in services/aiGateway.js (shared with the external /v1 gateway). This
// function's job is just: resolve org + integration from the authenticated
// dashboard user, call the shared service, and return the response in the
// exact same shape the frontend (Playground, etc.) has always expected.
async function handleProxyRequest(req, res) {
  const { provider, model, messages, prompt, integration_id } = req.body;

  if (!provider || !model) {
    return res.status(400).json({ error: 'provider and model are required.' });
  }
  if (!messages && !prompt) {
    return res.status(400).json({ error: 'messages (array) or prompt (string) is required.' });
  }

  // Normalize to messages array
  const normalizedMessages = messages ?? [{ role: 'user', content: prompt }];

  try {
    // 1. Resolve organization server-side — never trust frontend
    const organization_id = await getUserOrgId(req.user.id);

    // 1a. Check org is not suspended — if is_active = false, block all proxy
    //     calls from this org before decrypting any key.
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('is_active')
      .eq('id', organization_id)
      .single();

    if (orgErr || !org) {
      return res.status(400).json({ error: 'Organization not found.' });
    }
    if (!org.is_active) {
      return res.status(403).json({ error: 'Your organization has been suspended. Please contact support.' });
    }

    // 1b. Plan gating — Playground must respect the same feature flag and
    // model-tier/spend limits the external API gateway (v1.js) enforces.
    // Without this, a Starter-plan org could bypass those limits entirely
    // just by using the dashboard Playground instead of a Platform Key.
    if (!req.entitlements.hasFeature('ai_playground')) {
      return res.status(403).json({ error: 'The AI Playground is not included in your current plan. Upgrade to use it.' });
    }

    let integrationQuery = supabase
      .from('ai_integrations')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('provider', provider)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1);

    // If caller specifies integration_id, pin to it (still org-scoped)
    if (integration_id) {
      integrationQuery = integrationQuery.eq('id', integration_id);
    }

    const { data: integration, error: intError } = await integrationQuery.maybeSingle();

    if (intError || !integration) {
      return res.status(400).json({ error: `No active ${provider} integration found for your organization.` });
    }

    // 2a. Same model access-tier + monthly spend enforcement as the external
    // API gateway — see middleware/requireEntitlements.js. Throws
    // isEntitlementModelNotAllowed / isBudgetBlocked, caught below.
    await checkModelAndSpendEntitlement({
      supabase,
      organization_id,
      provider,
      model,
    });

    // 3. Call the shared gateway — does the provider call, cost calc, and logging
    const { responseText, inputTokens, outputTokens, totalTokens, cost_usd } = await callProviderAndLog({
      organization_id,
      integration_id: integration.id,
      provider,
      model,
      messages: normalizedMessages,
      source: 'playground',
    });

    // 4. Return response — never include raw key (unchanged shape)
    return res.json({
      success: true,
      data: {
        text: responseText,
        usage: { input_tokens: inputTokens, output_tokens: outputTokens, total_tokens: totalTokens, cost_usd }
      }
    });

  } catch (err) {
    console.error('[proxy] Error:', err.message, err.response?.data ?? '');

    if (err.isUnsupportedProvider) {
      return res.status(400).json({ error: err.message });
    }

    if (err.isBudgetBlocked) {
      return res.status(403).json({ error: err.message });
    }

    if (err.isEntitlementModelNotAllowed) {
      return res.status(403).json({ error: err.message });
    }

    if (err.isUnpricedModel) {
      return res.status(422).json({ error: err.message });
    }

    // Provider errors (4xx/5xx from the AI API)
    if (err.response) {
      const status = err.response.status;
      const providerMsg = err.response.data?.error?.message
        ?? err.response.data?.message
        ?? 'Provider returned an error.';
      return res.status(status >= 400 && status < 600 ? status : 502).json({ error: providerMsg });
    }

    return res.status(500).json({ error: err.message || 'Proxy request failed.' });
  }
}

router.post('/chat', attachEntitlements, handleProxyRequest);
router.post('/generate', attachEntitlements, handleProxyRequest);  // legacy alias

export default router;

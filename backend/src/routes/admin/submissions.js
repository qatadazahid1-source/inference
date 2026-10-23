import express from 'express';
import axios from 'axios';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/submissions — all pending + reviewed submissions ──────────
router.get('/', async (req, res) => {
  try {
    const { status = 'pending', type = 'all' } = req.query;

    let providers = [], models = [];

    if (type === 'all' || type === 'providers') {
      let q = supabase
        .from('user_provider_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      providers = data || [];
    }

    if (type === 'all' || type === 'models') {
      let q = supabase
        .from('user_model_submissions')
        .select('*')
        .order('created_at', { ascending: false });
      if (status !== 'all') q = q.eq('status', status);
      const { data, error } = await q;
      if (error) throw error;
      models = data || [];
    }

    // Enrich with submitter email by joining via users table (service-role can read)
    const allUserIds = [
      ...new Set([
        ...providers.map(p => p.submitted_by),
        ...models.map(m => m.submitted_by),
      ]),
    ];

    let emailMap = {};
    if (allUserIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, email, full_name')
        .in('id', allUserIds);

      (usersData || []).forEach(u => {
        emailMap[u.id] = { email: u.email, full_name: u.full_name };
      });
    }

    // Enrich with organization names
    const allOrgIds = [
      ...new Set([
        ...providers.map(p => p.organization_id).filter(Boolean),
        ...models.map(m => m.organization_id).filter(Boolean),
      ]),
    ];

    let orgMap = {};
    if (allOrgIds.length > 0) {
      const { data: orgsData } = await supabase
        .from('organizations')
        .select('id, name')
        .in('id', allOrgIds);

      (orgsData || []).forEach(o => {
        orgMap[o.id] = o.name;
      });
    }

    // Enrich models with pricing_type and catalog comparison
    models = models.map(m => {
      const firstComp = Array.isArray(m.pricing_components) ? m.pricing_components[0] : null;
      const pricingType = firstComp?.pricing_type || (m.notes?.includes('[Custom Rate]') ? 'custom_rate' : 'global_update');
      const priceDiffDetected = Boolean(firstComp?.price_diff_detected || m.notes?.includes('[Price Difference Detected]'));

      const inputComp = Array.isArray(m.pricing_components)
        ? m.pricing_components.find(c => c.component_type === 'input_tokens')
        : null;
      const outputComp = Array.isArray(m.pricing_components)
        ? m.pricing_components.find(c => c.component_type === 'output_tokens')
        : null;

      const hasCatalogRef = inputComp?.catalog_per_1k !== undefined || outputComp?.catalog_per_1k !== undefined;
      const catalogPricing = hasCatalogRef ? {
        input_cost_per_1k: inputComp?.catalog_per_1k ?? null,
        output_cost_per_1k: outputComp?.catalog_per_1k ?? null,
      } : null;

      return {
        ...m,
        pricing_type: pricingType,
        price_diff_detected: priceDiffDetected,
        catalog_pricing: catalogPricing,
        organization_name: orgMap[m.organization_id] || 'Organization',
        submitter: emailMap[m.submitted_by] || null,
      };
    });

    providers = providers.map(p => ({
      ...p,
      organization_name: orgMap[p.organization_id] || 'Organization',
      submitter: emailMap[p.submitted_by] || null,
    }));

    res.json({ data: { providers, models } });
  } catch (err) {
    console.error('[admin/submissions] GET error:', err.message);
    res.status(500).json({ error: 'Failed to load submissions.' });
  }
});

// ─── POST /api/admin/submissions/providers/:id/approve ───────────────────────
router.post('/providers/:id/approve', async (req, res) => {
  const { id } = req.params;

  try {
    // Fetch the submission
    const { data: sub, error: fetchErr } = await supabase
      .from('user_provider_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !sub) return res.status(404).json({ error: 'Submission not found.' });
    if (sub.status !== 'pending') return res.status(409).json({ error: `Submission is already ${sub.status}.` });

    // Check catalog collision (may have been added since submission)
    const { data: existing } = await supabase
      .from('ai_providers')
      .select('id')
      .eq('provider_id', sub.provider_id)
      .maybeSingle();

    if (existing) {
      // Mark approved and point to existing row instead of creating a duplicate
      await supabase
        .from('user_provider_submissions')
        .update({
          status: 'approved',
          reviewed_by: req.user.id,
          reviewed_at: new Date().toISOString(),
          approved_provider_id: existing.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return res.json({ success: true, note: 'Provider already exists in catalog. Marked approved and linked.', catalog_id: existing.id });
    }

    // Insert into ai_providers catalog
    const { data: created, error: insertErr } = await supabase
      .from('ai_providers')
      .insert({
        name:        sub.name,
        provider_id: sub.provider_id,
        color:       '#64748b', // neutral default; admin can change later
        is_active:   true,
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Update submission status
    await supabase
      .from('user_provider_submissions')
      .update({
        status:              'approved',
        reviewed_by:         req.user.id,
        reviewed_at:         new Date().toISOString(),
        approved_provider_id: created.id,
        updated_at:          new Date().toISOString(),
      })
      .eq('id', id);

    res.json({ success: true, catalog_id: created.id });
  } catch (err) {
    console.error('[admin/submissions] approve provider error:', err.message);
    res.status(500).json({ error: 'Failed to approve provider submission.' });
  }
});

// ─── POST /api/admin/submissions/providers/:id/reject ────────────────────────
router.post('/providers/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason?.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required.' });
  }

  try {
    const { data: sub } = await supabase
      .from('user_provider_submissions')
      .select('status')
      .eq('id', id)
      .single();

    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (sub.status !== 'pending') return res.status(409).json({ error: `Submission is already ${sub.status}.` });

    await supabase
      .from('user_provider_submissions')
      .update({
        status:           'rejected',
        rejection_reason: reason.trim(),
        reviewed_by:      req.user.id,
        reviewed_at:      new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('id', id);

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/submissions] reject provider error:', err.message);
    res.status(500).json({ error: 'Failed to reject provider submission.' });
  }
});

// ─── POST /api/admin/submissions/models/:id/approve ──────────────────────────
router.post('/models/:id/approve', async (req, res) => {
  const { id } = req.params;
  const { update_global = false } = req.body || {};

  try {
    const { data: sub, error: fetchErr } = await supabase
      .from('user_model_submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !sub) return res.status(404).json({ error: 'Submission not found.' });
    if (sub.status !== 'pending') return res.status(409).json({ error: `Submission is already ${sub.status}.` });

    // Collision check in live catalog
    const { data: existing } = await supabase
      .from('model_pricing')
      .select('id, input_cost_per_1k, output_cost_per_1k')
      .eq('provider', sub.provider)
      .eq('model', sub.model_id)
      .eq('is_active', true)
      .maybeSingle();

    if (existing) {
      if (update_global) {
        await supabase
          .from('model_pricing')
          .update({
            input_cost_per_1k:  sub.input_cost_per_1k  ?? existing.input_cost_per_1k,
            output_cost_per_1k: sub.output_cost_per_1k ?? existing.output_cost_per_1k,
            updated_at:         new Date().toISOString(),
          })
          .eq('id', existing.id);

        try {
          await supabase.from('pricing_audit_log').insert({
            changed_by:       req.user.id,
            model_pricing_id: existing.id,
            provider:         sub.provider,
            model_name:       sub.model_id,
            old_input_cost:   existing.input_cost_per_1k,
            old_output_cost:  existing.output_cost_per_1k,
            new_input_cost:   sub.input_cost_per_1k,
            new_output_cost:  sub.output_cost_per_1k,
            action:           'global_catalog_update_from_submission',
          });
        } catch (_) {}
      }

      await supabase
        .from('user_model_submissions')
        .update({
          status: 'approved',
          reviewed_by: req.user.id,
          reviewed_at: new Date().toISOString(),
          approved_model_pricing_id: existing.id,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      return res.json({
        success: true,
        note: update_global
          ? 'Global catalog updated and submission approved.'
          : 'Approved as custom organization rate linked to catalog model.',
        catalog_id: existing.id,
      });
    }

    // Insert into model_pricing
    const { data: created, error: insertErr } = await supabase
      .from('model_pricing')
      .insert({
        provider:           sub.provider,
        model:              sub.model_id,
        input_cost_per_1k:  sub.input_cost_per_1k  ?? 0,
        output_cost_per_1k: sub.output_cost_per_1k ?? 0,
        context_window:     sub.context_window     ?? null,
        is_active:          true,
        source_type:        'user_submission',
        source_name:        'User Submission',
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    // Log to pricing_audit_log
    try {
      await supabase.from('pricing_audit_log').insert({
        changed_by:       req.user.id,
        model_pricing_id: created.id,
        provider:         sub.provider,
        model_name:       sub.model_id,
        old_input_cost:   null,
        old_output_cost:  null,
        new_input_cost:   sub.input_cost_per_1k  ?? 0,
        new_output_cost:  sub.output_cost_per_1k ?? 0,
        action:           'approved_user_submission',
        source_type:      'user_submission',
        source_name:      'User Submission',
      });
    } catch (_) { /* audit failure is non-fatal */ }

    // Update submission
    await supabase
      .from('user_model_submissions')
      .update({
        status:                    'approved',
        reviewed_by:               req.user.id,
        reviewed_at:               new Date().toISOString(),
        approved_model_pricing_id: created.id,
        updated_at:                new Date().toISOString(),
      })
      .eq('id', id);

    res.json({ success: true, catalog_id: created.id });
  } catch (err) {
    console.error('[admin/submissions] approve model error:', err.message);
    res.status(500).json({ error: 'Failed to approve model submission.' });
  }
});

// ─── POST /api/admin/submissions/models/:id/reject ───────────────────────────
router.post('/models/:id/reject', async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason?.trim()) {
    return res.status(400).json({ error: 'A rejection reason is required.' });
  }

  try {
    const { data: sub } = await supabase
      .from('user_model_submissions')
      .select('status')
      .eq('id', id)
      .single();

    if (!sub) return res.status(404).json({ error: 'Submission not found.' });
    if (sub.status !== 'pending') return res.status(409).json({ error: `Submission is already ${sub.status}.` });

    await supabase
      .from('user_model_submissions')
      .update({
        status:           'rejected',
        rejection_reason: reason.trim(),
        reviewed_by:      req.user.id,
        reviewed_at:      new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      })
      .eq('id', id);

    res.json({ success: true });
  } catch (err) {
    console.error('[admin/submissions] reject model error:', err.message);
    res.status(500).json({ error: 'Failed to reject model submission.' });
  }
});

// ─── POST /api/admin/submissions/test-ping ────────────────────────────────────
// Probes an API Base URL or test a submitted provider/model
router.post('/test-ping', async (req, res) => {
  let { base_url, protocol = 'openai_compatible', model_id, provider_sub_id, model_sub_id } = req.body;

  try {
    // If provider_sub_id is supplied, look up the submission
    if (provider_sub_id && !base_url) {
      const { data: pSub } = await supabase
        .from('user_provider_submissions')
        .select('base_url, protocol')
        .eq('id', provider_sub_id)
        .single();
      if (pSub?.base_url) {
        base_url = pSub.base_url;
        protocol = pSub.protocol || protocol;
      }
    }

    // If model_sub_id is supplied, look up the model and its provider base_url
    if (model_sub_id && !base_url) {
      const { data: mSub } = await supabase
        .from('user_model_submissions')
        .select('provider, model_id')
        .eq('id', model_sub_id)
        .single();
      if (mSub) {
        model_id = mSub.model_id;
        const { data: pSub } = await supabase
          .from('user_provider_submissions')
          .select('base_url, protocol')
          .eq('provider_id', mSub.provider)
          .eq('status', 'approved')
          .maybeSingle();
        if (pSub?.base_url) {
          base_url = pSub.base_url;
        } else if (mSub.provider === 'openai') {
          base_url = 'https://api.openai.com/v1';
        } else if (mSub.provider === 'groq') {
          base_url = 'https://api.groq.com/openai/v1';
        } else if (mSub.provider === 'mistral') {
          base_url = 'https://api.mistral.ai/v1';
        }
      }
    }

    if (!base_url || typeof base_url !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'No valid API Base URL provided or found for this submission.',
      });
    }

    // Auto-clean base_url
    let cleanUrl = base_url.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    const startTime = Date.now();

    let probeEndpoint = `${cleanUrl}/chat/completions`;
    let response;
    let requestError = null;

    try {
      response = await axios.post(
        probeEndpoint,
        {
          model: model_id || 'test-probe',
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 1,
        },
        {
          headers: {
            'Authorization': 'Bearer ordisum_probe_test_token',
            'Content-Type': 'application/json',
          },
          timeout: 6000,
          validateStatus: () => true, // Don't throw on 4xx/5xx
        }
      );
    } catch (err) {
      requestError = err;
    }

    const latencyMs = Date.now() - startTime;

    if (requestError) {
      const errMsg = requestError.message || '';
      const code = requestError.code || '';

      if (code === 'ENOTFOUND' || errMsg.includes('getaddrinfo ENOTFOUND')) {
        return res.json({
          success: true,
          reachable: false,
          status_code: null,
          latency_ms: latencyMs,
          verdict: 'DNS_ERROR',
          badge: 'danger',
          recommendation: 'REJECT',
          title: 'DNS Resolution Failed (Domain Not Found)',
          message: `The domain in Base URL "${cleanUrl}" could not be resolved. The host does not exist or has a typo. Do NOT approve.`,
        });
      }

      if (code === 'ECONNREFUSED' || errMsg.includes('ECONNREFUSED')) {
        return res.json({
          success: true,
          reachable: false,
          status_code: null,
          latency_ms: latencyMs,
          verdict: 'CONNECTION_REFUSED',
          badge: 'danger',
          recommendation: 'REJECT',
          title: 'Connection Refused',
          message: `The server at "${cleanUrl}" actively refused the connection. Server may be down or port is blocked.`,
        });
      }

      if (code === 'ECONNABORTED' || errMsg.includes('timeout')) {
        return res.json({
          success: true,
          reachable: false,
          status_code: null,
          latency_ms: latencyMs,
          verdict: 'TIMEOUT',
          badge: 'warning',
          recommendation: 'CAUTION',
          title: 'Connection Timed Out (6000ms)',
          message: `The server at "${cleanUrl}" did not respond within 6 seconds. Host may be unreachable or extremely slow.`,
        });
      }

      return res.json({
        success: true,
        reachable: false,
        status_code: null,
        latency_ms: latencyMs,
        verdict: 'NETWORK_ERROR',
        badge: 'danger',
        recommendation: 'REJECT',
        title: 'Network / SSL Error',
        message: `Network error connecting to "${cleanUrl}": ${errMsg}`,
      });
    }

    const status = response.status;
    const rawData = typeof response.data === 'string'
      ? response.data.slice(0, 300)
      : JSON.stringify(response.data).slice(0, 300);

    if (status === 200) {
      return res.json({
        success: true,
        reachable: true,
        status_code: 200,
        latency_ms: latencyMs,
        verdict: 'HEALTHY_200',
        badge: 'success',
        recommendation: 'APPROVE',
        title: 'HTTP 200 OK — Fully Accessible',
        message: `Endpoint responded successfully with HTTP 200 OK (${latencyMs}ms). It is live, reachable, and ready.`,
        raw_snippet: rawData,
      });
    }

    if (status === 401 || status === 403) {
      return res.json({
        success: true,
        reachable: true,
        status_code: status,
        latency_ms: latencyMs,
        verdict: 'VALID_AUTH_REQUIRED',
        badge: 'info',
        recommendation: 'APPROVE',
        title: `HTTP ${status} — Valid API (Auth Required)`,
        message: `Endpoint is live and correctly responded with HTTP ${status} Authentication Required (${latencyMs}ms). This is expected behavior for OpenAI-compatible APIs when probed without a real user API key. Safe to approve!`,
        raw_snippet: rawData,
      });
    }

    if (status === 400) {
      return res.json({
        success: true,
        reachable: true,
        status_code: 400,
        latency_ms: latencyMs,
        verdict: 'ACTIVE_BAD_REQUEST',
        badge: 'info',
        recommendation: 'APPROVE',
        title: 'HTTP 400 — Active Server',
        message: `Endpoint reached and processed request (${latencyMs}ms). Server responded with 400 (likely due to probe model identifier). The endpoint is live.`,
        raw_snippet: rawData,
      });
    }

    if (status === 404) {
      return res.json({
        success: true,
        reachable: true,
        status_code: 404,
        latency_ms: latencyMs,
        verdict: 'NOT_FOUND_404',
        badge: 'danger',
        recommendation: 'REJECT',
        title: 'HTTP 404 — Endpoint Not Found',
        message: `Endpoint returned 404 Not Found (${latencyMs}ms). The Base URL path is likely wrong (e.g. missing /v1, e.g. should be "${cleanUrl}/v1"). Double-check before approving.`,
        raw_snippet: rawData,
      });
    }

    return res.json({
      success: true,
      reachable: true,
      status_code: status,
      latency_ms: latencyMs,
      verdict: `HTTP_${status}`,
      badge: status >= 500 ? 'danger' : 'warning',
      recommendation: status >= 500 ? 'CAUTION' : 'REVIEW',
      title: `HTTP ${status} Response`,
      message: `Endpoint responded with HTTP ${status} (${latencyMs}ms).`,
      raw_snippet: rawData,
    });

  } catch (err) {
    console.error('[admin/submissions/test-ping] Error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;

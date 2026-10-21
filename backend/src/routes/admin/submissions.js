import express from 'express';
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
        submitter: emailMap[m.submitted_by] || null,
      };
    });

    providers = providers.map(p => ({ ...p, submitter: emailMap[p.submitted_by] || null }));

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

export default router;

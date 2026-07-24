import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── Pricing Audit Logger ────────────────────────────────────────────────────
// Inserts a row in pricing_audit_log before returning a response.
// Called by PUT and POST routes. Never throws — audit failure is silent so
// the actual pricing update is not rolled back because of it.
async function logPricingChange({ changedBy, modelPricingId, provider, modelName, oldInputCost, oldOutputCost, newInputCost, newOutputCost, action }) {
  try {
    await supabase.from('pricing_audit_log').insert({
      changed_by: changedBy,
      model_pricing_id: modelPricingId,
      provider,
      model_name: modelName,
      old_input_cost: oldInputCost ?? null,
      old_output_cost: oldOutputCost ?? null,
      new_input_cost: newInputCost,
      new_output_cost: newOutputCost,
      action,
    });
  } catch (err) {
    console.error('[admin/pricing] Audit log write failed (non-fatal):', err.message);
  }
}

// ─── GET /api/admin/pricing ──────────────────────────────────────────────────
// All model_pricing rows, ordered by provider then model name.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('model_pricing')
      .select('*')
      .order('provider', { ascending: true })
      .order('model', { ascending: true });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[admin/pricing] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/pricing/:id ──────────────────────────────────────────────
// Update a specific pricing row by UUID. Logs to pricing_audit_log.
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { input_cost_per_1k, output_cost_per_1k, is_active } = req.body;

  try {
    // Fetch current values for the audit log
    const { data: existing, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('provider, model, input_cost_per_1k, output_cost_per_1k')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Pricing row not found.' });
    }

    const updates = {};
    if (input_cost_per_1k !== undefined) updates.input_cost_per_1k = input_cost_per_1k;
    if (output_cost_per_1k !== undefined) updates.output_cost_per_1k = output_cost_per_1k;
    if (is_active !== undefined) updates.is_active = is_active;
    updates.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('model_pricing')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    // Determine action for the audit log
    const action = is_active === false ? 'deactivated' : 'updated';

    await logPricingChange({
      changedBy: req.user.id,
      modelPricingId: id,
      provider: existing.provider,
      modelName: existing.model,
      oldInputCost: existing.input_cost_per_1k,
      oldOutputCost: existing.output_cost_per_1k,
      newInputCost: updates.input_cost_per_1k ?? existing.input_cost_per_1k,
      newOutputCost: updates.output_cost_per_1k ?? existing.output_cost_per_1k,
      action,
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/pricing] PUT error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/admin/pricing ─────────────────────────────────────────────────
// Add a new provider+model pricing entry. Logs to pricing_audit_log.
router.post('/', async (req, res) => {
  const { provider, model, input_cost_per_1k, output_cost_per_1k, context_window } = req.body;

  if (!provider || !model || input_cost_per_1k === undefined || output_cost_per_1k === undefined) {
    return res.status(400).json({ error: 'provider, model, input_cost_per_1k, and output_cost_per_1k are required.' });
  }

  try {
    const { data, error } = await supabase
      .from('model_pricing')
      .insert({
        provider,
        model,
        input_cost_per_1k,
        output_cost_per_1k,
        context_window: context_window || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    await logPricingChange({
      changedBy: req.user.id,
      modelPricingId: data.id,
      provider,
      modelName: model,
      oldInputCost: null,
      oldOutputCost: null,
      newInputCost: input_cost_per_1k,
      newOutputCost: output_cost_per_1k,
      action: 'created',
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/pricing] POST error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── DELETE /api/admin/pricing/:id ───────────────────────────────────────────
// Soft-delete only: sets is_active = false. Never hard-deletes.
// Deactivated models keep all historical cost data intact.
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { data: existing, error: fetchErr } = await supabase
      .from('model_pricing')
      .select('provider, model, input_cost_per_1k, output_cost_per_1k')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return res.status(404).json({ error: 'Pricing row not found.' });
    }

    const { data, error } = await supabase
      .from('model_pricing')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    await logPricingChange({
      changedBy: req.user.id,
      modelPricingId: id,
      provider: existing.provider,
      modelName: existing.model,
      oldInputCost: existing.input_cost_per_1k,
      oldOutputCost: existing.output_cost_per_1k,
      newInputCost: existing.input_cost_per_1k,
      newOutputCost: existing.output_cost_per_1k,
      action: 'deactivated',
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/pricing] DELETE error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/pricing/audit-log ────────────────────────────────────────
// Most recent 50 entries from pricing_audit_log with the changer's email.
router.get('/audit-log', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('pricing_audit_log')
      .select(`
        id,
        provider,
        model_name,
        old_input_cost,
        old_output_cost,
        new_input_cost,
        new_output_cost,
        action,
        changed_at,
        changed_by,
        users!pricing_audit_log_changed_by_fkey (
          email,
          full_name
        )
      `)
      .order('changed_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    // Flatten the joined user data for easier frontend consumption
    const mapped = (data || []).map((row) => ({
      id: row.id,
      provider: row.provider,
      model_name: row.model_name,
      old_input_cost: row.old_input_cost,
      old_output_cost: row.old_output_cost,
      new_input_cost: row.new_input_cost,
      new_output_cost: row.new_output_cost,
      action: row.action,
      changed_at: row.changed_at,
      changed_by_email: row.users?.email ?? 'Unknown',
      changed_by_name: row.users?.full_name ?? '',
    }));

    res.json({ data: mapped });
  } catch (err) {
    console.error('[admin/pricing] GET /audit-log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

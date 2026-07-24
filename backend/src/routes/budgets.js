import express from 'express';
import { supabase } from '../index.js';

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

// GET /api/budgets
router.get('/', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    // We can rely on RLS, but passing organization_id is good practice
    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json(budgets || []);
  } catch (err) {
    console.error('[budgets] GET error:', err.message, err);
    res.status(500).json({ error: 'Failed to fetch budgets' });
  }
});

// POST /api/budgets
router.post('/', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);
    const { name, total_budget, period = 'monthly', alert_at_50, alert_at_75, alert_at_90, alert_at_100, hard_limit } = req.body;

    const { data, error } = await supabase
      .from('budgets')
      .insert({
        organization_id,
        name,
        total_budget,
        period,
        alert_at_50: !!alert_at_50,
        alert_at_75: !!alert_at_75,
        alert_at_90: !!alert_at_90,
        alert_at_100: !!alert_at_100,
        hard_limit: !!hard_limit,
        created_by: req.user.id
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (err) {
    console.error('[budgets] POST error:', err.message, err);
    res.status(500).json({ error: 'Failed to create budget' });
  }
});

// GET /api/budgets/alerts
router.get('/alerts', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    console.error('[budgets] GET /alerts error:', err.message, err);
    res.status(500).json({ error: 'Failed to fetch alerts' });
  }
});

// PUT /api/budgets/:id
// Updates an existing budget. All fields are optional — only the ones
// provided in the request body are changed; everything else stays as is.
router.put('/:id', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);
    const { name, total_budget, period, alert_at_50, alert_at_75, alert_at_90, alert_at_100, hard_limit } = req.body;

    const updatePayload = { updated_at: new Date().toISOString() };

    if (name !== undefined) updatePayload.name = name;
    if (total_budget !== undefined) updatePayload.total_budget = total_budget;
    if (period !== undefined) updatePayload.period = period;
    if (alert_at_50 !== undefined) updatePayload.alert_at_50 = !!alert_at_50;
    if (alert_at_75 !== undefined) updatePayload.alert_at_75 = !!alert_at_75;
    if (alert_at_90 !== undefined) updatePayload.alert_at_90 = !!alert_at_90;
    if (alert_at_100 !== undefined) updatePayload.alert_at_100 = !!alert_at_100;
    if (hard_limit !== undefined) updatePayload.hard_limit = !!hard_limit;

    // Scope the update to this organization, same as DELETE, so a user
    // can never edit another organization's budget by guessing an id.
    const { data, error } = await supabase
      .from('budgets')
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .select()
      .single();

    if (error) throw error;

    if (!data) {
      return res.status(404).json({ error: 'Budget not found' });
    }

    res.json(data);
  } catch (err) {
    console.error('[budgets] PUT error:', err.message, err);
    res.status(500).json({ error: 'Failed to update budget' });
  }
});

// DELETE /api/budgets/:id
router.delete('/:id', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);
    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', organization_id); // Ensure scoping

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[budgets] DELETE error:', err.message, err);
    res.status(500).json({ error: 'Failed to delete budget' });
  }
});

export default router;

import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

const PLAN_SELECT = 'id, name, slug, price_monthly, price_annual, tagline, is_popular, cta_text, cta_variant, sort_order, display_features, system_limits, lemonsqueezy_variant_id_monthly, lemonsqueezy_variant_id_annual, is_active, created_at';

// â”€â”€â”€ GET /api/admin/plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// All plans (active and inactive), ordered by sort_order.
router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select(PLAN_SELECT)
      .order('sort_order', { ascending: true });

    if (error) throw error;
    res.json({ data: data || [] });
  } catch (err) {
    console.error('[admin/plans] GET / error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ POST /api/admin/plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Create a new plan.
router.post('/', async (req, res) => {
  try {
    const {
      name, slug, price_monthly, price_annual,
      tagline, is_popular, cta_text, cta_variant, sort_order,
      display_features, system_limits,
      lemonsqueezy_variant_id_monthly, lemonsqueezy_variant_id_annual,
    } = req.body;

    if (!name || !slug) {
      return res.status(400).json({ error: 'name and slug are required' });
    }

    const { data, error } = await supabase
      .from('plans')
      .insert({
        name,
        slug,
        price_monthly: price_monthly ?? 0,
        price_annual: price_annual ?? 0,
        tagline: tagline ?? '',
        is_popular: is_popular ?? false,
        cta_text: cta_text ?? 'Start Free Trial',
        cta_variant: cta_variant ?? 'ghost',
        sort_order: sort_order ?? 0,
        display_features: display_features ?? [],
        system_limits: system_limits ?? {},
        lemonsqueezy_variant_id_monthly: lemonsqueezy_variant_id_monthly || null,
        lemonsqueezy_variant_id_annual: lemonsqueezy_variant_id_annual || null,
        is_active: true,
      })
      .select(PLAN_SELECT)
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'plan.created',
      resource_type: 'plan',
      resource_id: data.id,
      organization_id: null,
      new_values: { name, slug },
      ip_address: req.ip || null,
    });

    res.status(201).json({ data });
  } catch (err) {
    console.error('[admin/plans] POST / error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ PUT /api/admin/plans/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Update any editable field on a plan.
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const EDITABLE = [
      'name', 'slug', 'price_monthly', 'price_annual',
      'tagline', 'is_popular', 'cta_text', 'cta_variant', 'sort_order',
      'display_features', 'system_limits',
      'lemonsqueezy_variant_id_monthly', 'lemonsqueezy_variant_id_annual',
      'is_active',
    ];

    const payload = {};
    for (const field of EDITABLE) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        payload[field] = req.body[field];
      }
    }

    if (Object.keys(payload).length === 0) {
      return res.status(400).json({ error: 'No editable fields provided' });
    }

    const { data, error } = await supabase
      .from('plans')
      .update(payload)
      .eq('id', id)
      .select(PLAN_SELECT)
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'plan.updated',
      resource_type: 'plan',
      resource_id: id,
      organization_id: null,
      new_values: payload,
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/plans] PUT /:id error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ DELETE /api/admin/plans/:id â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Soft-delete only â€” sets is_active = false. Hard deletes are blocked because
// subscriptions reference plan_id and we don't want orphaned rows.
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('plans')
      .update({ is_active: false })
      .eq('id', id)
      .select(PLAN_SELECT)
      .single();

    if (error) throw error;

    await supabase.from('audit_logs').insert({
      user_id: req.user.id,
      action: 'plan.deactivated',
      resource_type: 'plan',
      resource_id: id,
      organization_id: null,
      new_values: { is_active: false },
      ip_address: req.ip || null,
    });

    res.json({ data });
  } catch (err) {
    console.error('[admin/plans] DELETE /:id error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

export default router;

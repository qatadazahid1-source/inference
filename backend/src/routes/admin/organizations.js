import express from 'express';
import { supabase } from '../../index.js';

const router = express.Router();

// ─── GET /api/admin/organizations ────────────────────────────────────────────
// Returns all organizations with member counts, subscription status, and spend.
router.get('/', async (req, res) => {
  try {
    const { data: orgs, error: orgsErr } = await supabase
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        is_active,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (orgsErr) throw orgsErr;

    // Fetch member counts via the view
    const { data: memberCounts, error: memberErr } = await supabase
      .from('v_org_member_counts')
      .select('*');
      
    if (memberErr) console.warn('[admin/organizations] Failed to fetch member counts:', memberErr);

    // Fetch active subscriptions (fetched separately from plans — avoids
    // PostgREST embedded-join schema-cache issues seen elsewhere)
    const { data: subscriptions, error: subErr } = await supabase
      .from('subscriptions')
      .select('organization_id, status, plan_id')
      .in('status', ['active', 'trialing']);

    if (subErr) console.warn('[admin/organizations] Failed to fetch subscriptions:', subErr);

    const planIds = [...new Set((subscriptions || []).map(s => s.plan_id).filter(Boolean))];
    let plansById = new Map();
    if (planIds.length) {
      const { data: plans, error: plansErr } = await supabase
        .from('plans')
        .select('id, name')
        .in('id', planIds);
      if (plansErr) console.warn('[admin/organizations] Failed to fetch plans:', plansErr);
      plansById = new Map((plans || []).map(p => [p.id, p]));
    }

    // Fetch spend (using v_budget_utilization as a proxy for total spend this month)
    const { data: spends, error: spendErr } = await supabase
      .from('v_budget_utilization')
      .select('organization_id, spent');
      
    if (spendErr) console.warn('[admin/organizations] Failed to fetch spends:', spendErr);

    // Merge data
    const enriched = orgs.map(org => {
      const counts = (memberCounts || []).find(m => m.organization_id === org.id);
      const sub = (subscriptions || []).find(s => s.organization_id === org.id);
      const plan = sub?.plan_id ? plansById.get(sub.plan_id) : null;
      // Sum all budget spends for the org (or 0)
      const orgSpends = (spends || []).filter(s => s.organization_id === org.id);
      const totalSpend = orgSpends.reduce((acc, curr) => acc + Number(curr.spent || 0), 0);

      return {
        ...org,
        active_members: counts?.active_members || 0,
        total_members: counts?.total_members || 0,
        plan_name: plan?.name || 'No Plan',
        subscription_status: sub?.status || 'none',
        monthly_spend: totalSpend
      };
    });

    res.json({ data: enriched });
  } catch (err) {
    console.error('[admin/organizations] GET error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/admin/organizations/:id ────────────────────────────────────────
// Returns deep details for a single organization.
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // Basic org details
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (orgErr) throw orgErr;

    // Members — fetched separately from users (avoids PostgREST embedded-join
    // schema-cache issues seen elsewhere in this project)
    const { data: rawMembers, error: membersErr } = await supabase
      .from('organization_members')
      .select('id, user_id, role, status, joined_at, last_active_at')
      .eq('organization_id', id);
    if (membersErr) console.warn('[admin/organizations] Failed to fetch members:', membersErr);

    const memberUserIds = [...new Set((rawMembers || []).map(m => m.user_id).filter(Boolean))];
    let usersById = new Map();
    if (memberUserIds.length) {
      const { data: memberUsers, error: usersErr } = await supabase
        .from('users')
        .select('id, email, full_name, avatar_url')
        .in('id', memberUserIds);
      if (usersErr) console.warn('[admin/organizations] Failed to fetch member users:', usersErr);
      usersById = new Map((memberUsers || []).map(u => [u.id, u]));
    }

    const members = (rawMembers || []).map(m => ({
      ...m,
      users: m.user_id ? (usersById.get(m.user_id) || null) : null
    }));

    // Integrations
    const { data: integrations } = await supabase
      .from('ai_integrations')
      .select('id, provider, display_name, status, last_sync_at, created_at')
      .eq('organization_id', id);

    // Subscription
    // Subscription — fetched separately from plans to avoid the same
    // embedded-join schema-cache issue as above.
    const { data: rawSubscription, error: subDetailErr } = await supabase
      .from('subscriptions')
      .select('id, status, billing_cycle, current_period_end, plan_id')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (subDetailErr) console.warn('[admin/organizations] Failed to fetch subscription:', subDetailErr);

    let subscription = rawSubscription || null;
    if (subscription?.plan_id) {
      const { data: plan, error: planErr } = await supabase
        .from('plans')
        .select('name, slug')
        .eq('id', subscription.plan_id)
        .maybeSingle();
      if (planErr) console.warn('[admin/organizations] Failed to fetch plan:', planErr);
      subscription = { ...subscription, plans: plan || null };
    }

    res.json({
      data: {
        ...org,
        members: members || [],
        integrations: integrations || [],
        subscription: subscription || null
      }
    });
  } catch (err) {
    console.error('[admin/organizations] GET /:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── PUT /api/admin/organizations/:id/status ─────────────────────────────────
// Suspend or reactivate an organization.
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { is_active } = req.body;

  if (typeof is_active !== 'boolean') {
    return res.status(400).json({ error: 'is_active boolean is required.' });
  }

  try {
    const { data, error } = await supabase
      .from('organizations')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Log this critical action
    await supabase.from('audit_logs').insert({
      organization_id: id,
      user_id: req.user.id, // the admin
      action: is_active ? 'org_reactivated' : 'org_suspended',
      resource_type: 'organization',
      resource_id: id, // id is a valid UUID representing the organization
      new_values: { is_active },
      ip_address: req.ip || null // Ensures null is sent instead of undefined or empty string
    });

    res.json({ success: true, data });
  } catch (err) {
    console.error('[admin/organizations] PUT /status error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;

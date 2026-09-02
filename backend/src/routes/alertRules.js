import express from 'express';
import { supabase } from '../index.js';
import { sendAlertEmail } from '../utils/sendAlertEmail.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';

const router = express.Router();

// Helper: resolve organization_id server-side from JWT (same pattern as budgets.js / reports.js)
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

// Maps a DB row (alert_rules table) to the shape the frontend's `AlertRule`
// type expects (src/types/dashboard.types.ts):
// condition_type -> condition, condition_value -> threshold, is_active -> enabled.
function mapRule(row) {
  return {
    id: row.id,
    name: row.name,
    condition: row.condition_type,
    threshold: Number(row.condition_value),
    scope: row.scope,
    channels: row.channels || [],
    enabled: row.is_active,
  };
}

// How long after a trigger a rule is skipped, to avoid spamming new alerts
// every time the page reloads / polls.
const DEDUP_WINDOW_MS = 60 * 60 * 1000; // 1 hour

// GET /api/alert-rules — all rules for the org, mapped to frontend shape
router.get('/', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('alert_rules')
      .select('id, name, condition_type, condition_value, scope, channels, is_active, last_triggered_at, created_at')
      .eq('organization_id', organization_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    res.json((data || []).map(mapRule));
  } catch (err) {
    console.error('[alertRules] GET / error:', err.message, err);
    res.status(500).json({ error: 'Failed to fetch alert rules' });
  }
});

// POST /api/alert-rules — create a new rule
// Accepts frontend-shape body: { name, condition, threshold, scope, channels, enabled }
router.post('/', attachEntitlements, async (req, res) => {
  try {
    const { name, condition, threshold, scope, channels, enabled } = req.body;

    if (!name || !condition || threshold === undefined || threshold === null) {
      return res.status(400).json({ error: 'name, condition, and threshold are required' });
    }

    const organization_id = await getUserOrgId(req.user.id);

    // Enforce max_alerts limit
    const { count, error: countErr } = await supabase
      .from('alert_rules')
      .select('*', { count: 'exact', head: true })
      .eq('organization_id', organization_id);
    if (countErr) throw countErr;
    if (!req.entitlements.checkLimit('alert_rules', count)) {
      const maxAlerts = req.entitlements.getLimit('alert_rules');
      return res.status(403).json({ error: `Plan limit reached. You can only create up to ${maxAlerts} alert rules.` });
    }
    const { data, error } = await supabase
      .from('alert_rules')
      .insert({
        organization_id,
        name,
        condition_type: condition,
        condition_value: threshold,
        scope: scope || null,
        channels: channels || ['in_app'],
        is_active: enabled !== undefined ? !!enabled : true,
        created_by: req.user.id,
      })
      .select('id, name, condition_type, condition_value, scope, channels, is_active, last_triggered_at, created_at')
      .single();

    if (error) throw error;
    res.status(201).json(mapRule(data));
  } catch (err) {
    console.error('[alertRules] POST / error:', err.message, err);
    res.status(500).json({ error: 'Failed to create alert rule' });
  }
});

// PUT /api/alert-rules/:id — partial update. Only fields present in the
// body are changed (same "only touch what's sent" pattern as budgets.js PUT).
router.put('/:id', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);
    const { name, condition, threshold, scope, channels, enabled } = req.body;

    const updatePayload = {};
    if (name !== undefined) updatePayload.name = name;
    if (condition !== undefined) updatePayload.condition_type = condition;
    if (threshold !== undefined) updatePayload.condition_value = threshold;
    if (scope !== undefined) updatePayload.scope = scope;
    if (channels !== undefined) updatePayload.channels = channels;
    if (enabled !== undefined) updatePayload.is_active = !!enabled;

    const { data, error } = await supabase
      .from('alert_rules')
      .update(updatePayload)
      .eq('id', req.params.id)
      .eq('organization_id', organization_id)
      .select('id, name, condition_type, condition_value, scope, channels, is_active, last_triggered_at, created_at')
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Alert rule not found' });

    res.json(mapRule(data));
  } catch (err) {
    console.error('[alertRules] PUT /:id error:', err.message, err);
    res.status(500).json({ error: 'Failed to update alert rule' });
  }
});

// DELETE /api/alert-rules/:id
router.delete('/:id', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { error } = await supabase
      .from('alert_rules')
      .delete()
      .eq('id', req.params.id)
      .eq('organization_id', organization_id);

    if (error) throw error;
    res.status(204).send();
  } catch (err) {
    console.error('[alertRules] DELETE /:id error:', err.message, err);
    res.status(500).json({ error: 'Failed to delete alert rule' });
  }
});

// POST /api/alert-rules/check — on-demand evaluation.
//
// Called once when the Alerts page loads (no background scheduler exists —
// that's a deliberate scope decision, see session notes). Fetches every
// active rule for the org and evaluates it against real current data:
//
//   - budget_percent: sums this month's real cost from api_usage_logs,
//     compares to the relevant budget's total_budget, triggers if the
//     percentage crosses condition_value.
//   - daily_cost: sums today's real cost from api_usage_logs, triggers if
//     it crosses condition_value.
//   - token_usage: sums today's real total_tokens from api_usage_logs,
//     triggers if it crosses condition_value. Same daily window as
//     daily_cost, just counting tokens instead of dollars.
//   - error_rate: counts failed requests (status='failed') in the last
//     hour, triggers if the count crosses condition_value. Relies on the
//     Failure/Error Cost Rule (aiGateway.js) actually logging failed
//     requests — without that, this would have nothing to count.
//   - cost_spike: compares today's spend-so-far against yesterday's full
//     daily total. Triggers if today exceeds yesterday × condition_value
//     (the multiplier is user-configurable via the rule's threshold field,
//     e.g. 2 means "alert if today is more than double yesterday") — but
//     only if yesterday had nonzero spend, to avoid "infinite spike" noise
//     on new or previously-quiet accounts.
//   - model_latency: NOT evaluated yet. There is no historical
//     latency-tracking data anywhere in the system to compare against, so
//     this rule saves correctly but never fires. This is an intentional
//     scope limit, not a bug — revisit once that data exists.
//
// Dedup: a rule that triggered within the last hour (last_triggered_at) is
// skipped, so reloading/polling the page doesn't spam duplicate alerts.
router.post('/check', async (req, res) => {
  try {
    const organization_id = await getUserOrgId(req.user.id);

    const { data: rules, error: rulesError } = await supabase
      .from('alert_rules')
      .select('id, name, condition_type, condition_value, scope, channels, last_triggered_at')
      .eq('organization_id', organization_id)
      .eq('is_active', true);

    if (rulesError) throw rulesError;

    let checked = 0;
    let triggered = 0;
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const yesterdayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1).toISOString();
    // yesterdayEnd is the same instant as todayStart — the boundary between
    // yesterday and today.
    const yesterdayEnd = todayStart;

    for (const rule of rules || []) {
      checked += 1;

      // Dedup: skip if this rule already fired within the last hour
      if (rule.last_triggered_at) {
        const lastTriggered = new Date(rule.last_triggered_at).getTime();
        if (now.getTime() - lastTriggered < DEDUP_WINDOW_MS) {
          continue;
        }
      }

        let emailRecipients = [];
        if (rule.channels?.includes('email')) {
          // Resolve email recipients once per rule if needed
          const { data: org } = await supabase.from('organizations').select('billing_email').eq('id', organization_id).single();
          if (org?.billing_email) {
            emailRecipients.push(org.billing_email);
          } else {
            const { data: members } = await supabase.from('organization_members').select('user_id').eq('organization_id', organization_id).in('role', ['owner', 'admin']);
            for (const m of members || []) {
              const { data: { user } } = await supabase.auth.admin.getUserById(m.user_id);
              if (user?.email) emailRecipients.push(user.email);
            }
          }
        }

      if (rule.condition_type === 'budget_percent') {
        // Real spend this month
        const { data: logs, error: logsError } = await supabase
          .from('api_usage_logs')
          .select('cost_usd')
          .eq('organization_id', organization_id)
          .gte('logged_at', monthStart);
        if (logsError) throw logsError;

        const spend = (logs || []).reduce((acc, r) => acc + Number(r.cost_usd || 0), 0);

        // Total budget for the org (sums across all budgets; rule.scope is
        // free text and not yet used to filter to a specific budget —
        // matches the "Scope: e.g. OpenAI, All Providers" free-text field
        // in the Create Rule modal, which has no structured backing yet).
        const { data: budgets, error: budgetsError } = await supabase
          .from('budgets')
          .select('total_budget')
          .eq('organization_id', organization_id);
        if (budgetsError) throw budgetsError;

        const totalBudget = (budgets || []).reduce((acc, b) => acc + Number(b.total_budget || 0), 0);
        if (totalBudget <= 0) continue; // nothing to compare against

        const percent = (spend / totalBudget) * 100;

        if (percent >= Number(rule.condition_value)) {
          const severity = percent >= 100 ? 'critical' : 'warning';
          await supabase.from('alerts').insert({
            organization_id,
            type: 'budget_threshold',
            severity,
            title: `Budget at ${percent.toFixed(0)}%`,
            message: `"${rule.name}" triggered: spend has reached ${percent.toFixed(1)}% of the total budget ($${spend.toFixed(2)} of $${totalBudget.toFixed(2)}).`,
            metadata: { rule_id: rule.id, percent, spend, total_budget: totalBudget },
            is_read: false,
          });
          await supabase
            .from('alert_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
            
          for (const email of emailRecipients) {
            await sendAlertEmail({
              to: email,
              subject: `[Ordisum] Alert: ${rule.name}`,
              title: `Alert Triggered: ${rule.name}`,
              message: `"${rule.name}" triggered: spend has reached ${percent.toFixed(1)}% of the total budget ($${spend.toFixed(2)} of $${totalBudget.toFixed(2)}).`,
              severity,
            });
          }
          
          triggered += 1;
        }
      } else if (rule.condition_type === 'daily_cost') {
        const { data: logs, error: logsError } = await supabase
          .from('api_usage_logs')
          .select('cost_usd')
          .eq('organization_id', organization_id)
          .gte('logged_at', todayStart);
        if (logsError) throw logsError;

        const todaySpend = (logs || []).reduce((acc, r) => acc + Number(r.cost_usd || 0), 0);

        if (todaySpend >= Number(rule.condition_value)) {
          const severity = todaySpend >= Number(rule.condition_value) * 1.5 ? 'critical' : 'warning';
          await supabase.from('alerts').insert({
            organization_id,
            type: 'budget_threshold',
            severity,
            title: 'Daily cost threshold reached',
            message: `"${rule.name}" triggered: today's spend is $${todaySpend.toFixed(2)}, at or above the $${Number(rule.condition_value).toFixed(2)} threshold.`,
            metadata: { rule_id: rule.id, today_spend: todaySpend, threshold: rule.condition_value },
            is_read: false,
          });
          await supabase
            .from('alert_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
            
          for (const email of emailRecipients) {
            await sendAlertEmail({
              to: email,
              subject: `[Ordisum] Alert: ${rule.name}`,
              title: `Alert Triggered: ${rule.name}`,
              message: `"${rule.name}" triggered: today's spend is $${todaySpend.toFixed(2)}, at or above the $${Number(rule.condition_value).toFixed(2)} threshold.`,
              severity,
            });
          }
          triggered += 1;
        }
      } else if (rule.condition_type === 'token_usage') {
        const { data: logs, error: logsError } = await supabase
          .from('api_usage_logs')
          .select('total_tokens')
          .eq('organization_id', organization_id)
          .gte('logged_at', todayStart);
        if (logsError) throw logsError;

        const todayTokens = (logs || []).reduce((acc, r) => acc + Number(r.total_tokens || 0), 0);

        if (todayTokens >= Number(rule.condition_value)) {
          const severity = todayTokens >= Number(rule.condition_value) * 1.5 ? 'critical' : 'warning';
          await supabase.from('alerts').insert({
            organization_id,
            type: 'budget_threshold',
            severity,
            title: 'Daily token usage threshold reached',
            message: `"${rule.name}" triggered: today's usage is ${todayTokens.toLocaleString()} tokens, at or above the ${Number(rule.condition_value).toLocaleString()} threshold.`,
            metadata: { rule_id: rule.id, today_tokens: todayTokens, threshold: rule.condition_value },
            is_read: false,
          });
          await supabase
            .from('alert_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
            
          for (const email of emailRecipients) {
            await sendAlertEmail({
              to: email,
              subject: `[Ordisum] Alert: ${rule.name}`,
              title: `Alert Triggered: ${rule.name}`,
              message: `"${rule.name}" triggered: today's usage is ${todayTokens.toLocaleString()} tokens, at or above the ${Number(rule.condition_value).toLocaleString()} threshold.`,
              severity,
            });
          }
          triggered += 1;
        }
      } else if (rule.condition_type === 'error_rate') {
        // Count failed requests in the last hour. Depends entirely on the
        // Failure/Error Cost Rule in aiGateway.js logging a row with
        // status='failed' for every failed provider call / key-decryption
        // failure — without that, failed_count would always be 0.
        const { count: failedCount, error: failedError } = await supabase
          .from('api_usage_logs')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', organization_id)
          .eq('status', 'failed')
          .gte('logged_at', oneHourAgo);
        if (failedError) throw failedError;

        const failed = failedCount || 0;

        if (failed >= Number(rule.condition_value)) {
          const severity = failed >= Number(rule.condition_value) * 2 ? 'critical' : 'warning';
          await supabase.from('alerts').insert({
            organization_id,
            type: 'system_error',
            severity,
            title: 'Elevated failure rate',
            message: `"${rule.name}" triggered: ${failed} failed request${failed === 1 ? '' : 's'} in the last hour, at or above the threshold of ${Number(rule.condition_value)}.`,
            metadata: { rule_id: rule.id, failed_count: failed, threshold: rule.condition_value },
            is_read: false,
          });
          await supabase
            .from('alert_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
            
          for (const email of emailRecipients) {
            await sendAlertEmail({
              to: email,
              subject: `[Ordisum] Alert: ${rule.name}`,
              title: `Alert Triggered: ${rule.name}`,
              message: `"${rule.name}" triggered: ${failed} failed request${failed === 1 ? '' : 's'} in the last hour, at or above the threshold of ${Number(rule.condition_value)}.`,
              severity,
            });
          }
          triggered += 1;
        }
      } else if (rule.condition_type === 'cost_spike') {
        // Compares today's spend-so-far against yesterday's full-day total.
        // Skipped entirely if yesterday had $0 spend — comparing against a
        // zero baseline would make any spend today register as an
        // "infinite" spike, which would just be alert noise on quiet/new
        // accounts rather than a real signal.
        const [{ data: todayLogs, error: todayError }, { data: yesterdayLogs, error: yesterdayError }] = await Promise.all([
          supabase
            .from('api_usage_logs')
            .select('cost_usd')
            .eq('organization_id', organization_id)
            .gte('logged_at', todayStart),
          supabase
            .from('api_usage_logs')
            .select('cost_usd')
            .eq('organization_id', organization_id)
            .gte('logged_at', yesterdayStart)
            .lt('logged_at', yesterdayEnd),
        ]);
        if (todayError) throw todayError;
        if (yesterdayError) throw yesterdayError;

        const todaySpend = (todayLogs || []).reduce((acc, r) => acc + Number(r.cost_usd || 0), 0);
        const yesterdaySpend = (yesterdayLogs || []).reduce((acc, r) => acc + Number(r.cost_usd || 0), 0);

        if (yesterdaySpend > 0 && todaySpend > yesterdaySpend * Number(rule.condition_value)) {
          const multiple = todaySpend / yesterdaySpend;
          const severity = multiple >= Number(rule.condition_value) * 2 ? 'critical' : 'warning';
          await supabase.from('alerts').insert({
            organization_id,
            type: 'cost_anomaly',
            severity,
            title: 'Spending spike detected',
            message: `"${rule.name}" triggered: today's spend ($${todaySpend.toFixed(2)}) is ${multiple.toFixed(1)}x yesterday's ($${yesterdaySpend.toFixed(2)}), above the ${Number(rule.condition_value)}x threshold.`,
            metadata: { rule_id: rule.id, today_spend: todaySpend, yesterday_spend: yesterdaySpend, multiple, threshold_multiple: rule.condition_value },
            is_read: false,
          });
          await supabase
            .from('alert_rules')
            .update({ last_triggered_at: now.toISOString() })
            .eq('id', rule.id);
            
          for (const email of emailRecipients) {
            await sendAlertEmail({
              to: email,
              subject: `[Ordisum] Alert: ${rule.name}`,
              title: `Alert Triggered: ${rule.name}`,
              message: `"${rule.name}" triggered: today's spend ($${todaySpend.toFixed(2)}) is ${multiple.toFixed(1)}x yesterday's ($${yesterdaySpend.toFixed(2)}), above the ${Number(rule.condition_value)}x threshold.`,
              severity,
            });
          }
          triggered += 1;
        }
      }
      // model_latency: intentionally not evaluated yet — there is no
      // latency-baseline data anywhere in the system to compare against.
    }

    res.json({ checked, triggered });
  } catch (err) {
    console.error('[alertRules] POST /check error:', err.message, err);
    res.status(500).json({ error: 'Failed to check alert rules' });
  }
});

export default router;

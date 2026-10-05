/**
 * Anomaly Detection Engine
 * ─────────────────────────
 * Statistical anomaly detection against `api_usage_logs`.
 * Uses Z-score / percentage deviation against a rolling 7-day baseline.
 *
 * Detection windows:
 *   - baseline: 7-day rolling hourly aggregates (excluding current window)
 *   - detection window: last 1 hour
 *
 * Severity thresholds (% deviation above baseline):
 *   LOW      >= 100%  (2x baseline)
 *   MEDIUM   >= 200%  (3x baseline)
 *   HIGH     >= 400%  (5x baseline)
 *   CRITICAL >= 800%  (9x baseline)
 *
 * Minimum baseline data: 24 hourly data points required before triggering.
 * This prevents false positives on new organizations with little history.
 *
 * Runs per-organization. Designed to be called from the scheduler.
 */

import { supabase } from '../index.js';
import { sendSlackAlert } from './sendSlackAlert.js';
import { dispatchWebhookEvent } from './webhookDispatcher.js';

const BASELINE_DAYS      = 7;       // days of history to build baseline
const DETECTION_HOURS    = 1;       // current window to compare against baseline
const MIN_BASELINE_HOURS = 24;      // minimum data points for reliable baseline

const SEVERITY_THRESHOLDS = [
  { pct: 800, severity: 'CRITICAL' },
  { pct: 400, severity: 'HIGH' },
  { pct: 200, severity: 'MEDIUM' },
  { pct: 100, severity: 'LOW' },
];

/**
 * Detect anomalies for a single organization.
 * @param {string} organization_id
 * @returns {Promise<Array>} list of anomalies detected
 */
export async function detectAnomaliesForOrg(organization_id) {
  const detected = [];
  const now      = new Date();

  // ── 1. Check entitlement ──────────────────────────────────────────────────
  const { data: entData } = await supabase
    .from('subscriptions')
    .select('plans!inner(system_limits)')
    .eq('organization_id', organization_id)
    .eq('status', 'active')
    .maybeSingle();

  const features = entData?.plans?.system_limits?.features ?? {};
  if (!features.anomaly_detection) {
    return detected; // Skip silently — not entitled
  }

  // ── 2. Build baseline (7-day hourly aggregates, excluding last 1 hour) ────
  const baselineStart = new Date(now - BASELINE_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const windowStart   = new Date(now - DETECTION_HOURS * 60 * 60 * 1000).toISOString();

  const { data: baselineLogs, error: baselineErr } = await supabase
    .from('api_usage_logs')
    .select('cost_usd, total_tokens, logged_at')
    .eq('organization_id', organization_id)
    .gte('logged_at', baselineStart)
    .lt('logged_at', windowStart)
    .neq('status', 'blocked');

  if (baselineErr) {
    console.error('[anomaly] Baseline fetch error:', baselineErr.message);
    return detected;
  }

  if (!baselineLogs || baselineLogs.length === 0) return detected;

  // ── 3. Bucket into hourly aggregates ─────────────────────────────────────
  const hourBuckets = {};
  for (const row of baselineLogs) {
    const hourKey = row.logged_at.slice(0, 13); // "2026-10-04T09"
    if (!hourBuckets[hourKey]) hourBuckets[hourKey] = { cost: 0, tokens: 0, requests: 0 };
    hourBuckets[hourKey].cost    += Number(row.cost_usd  ?? 0);
    hourBuckets[hourKey].tokens  += Number(row.total_tokens ?? 0);
    hourBuckets[hourKey].requests += 1;
  }

  const bucketValues = Object.values(hourBuckets);
  if (bucketValues.length < MIN_BASELINE_HOURS) return detected; // not enough history

  const avg = (arr, key) => arr.reduce((s, b) => s + b[key], 0) / arr.length;
  const baseCost     = avg(bucketValues, 'cost');
  const baseTokens   = avg(bucketValues, 'tokens');
  const baseRequests = avg(bucketValues, 'requests');

  // ── 4. Get current window ─────────────────────────────────────────────────
  const { data: currentLogs, error: currentErr } = await supabase
    .from('api_usage_logs')
    .select('cost_usd, total_tokens, logged_at')
    .eq('organization_id', organization_id)
    .gte('logged_at', windowStart)
    .neq('status', 'blocked');

  if (currentErr) {
    console.error('[anomaly] Current window fetch error:', currentErr.message);
    return detected;
  }

  const currentCost     = (currentLogs ?? []).reduce((s, r) => s + Number(r.cost_usd     ?? 0), 0);
  const currentTokens   = (currentLogs ?? []).reduce((s, r) => s + Number(r.total_tokens ?? 0), 0);
  const currentRequests = (currentLogs ?? []).length;

  // ── 5. Compare and detect ─────────────────────────────────────────────────
  const checks = [
    { metric: 'cost_usd',      type: 'cost_spike',    baseline: baseCost,     observed: currentCost },
    { metric: 'total_tokens',  type: 'token_spike',   baseline: baseTokens,   observed: currentTokens },
    { metric: 'request_count', type: 'request_spike', baseline: baseRequests, observed: currentRequests },
  ];

  for (const check of checks) {
    if (check.baseline < 0.001) continue; // avoid division by near-zero

    const deviationPct = ((check.observed - check.baseline) / check.baseline) * 100;
    if (deviationPct <= 0) continue; // not a spike

    const match = SEVERITY_THRESHOLDS.find(t => deviationPct >= t.pct);
    if (!match) continue;

    // ── 5a. Dedup: skip if already detected in the last 2 hours ─────────
    const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000).toISOString();
    const { data: existing } = await supabase
      .from('anomalies')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('type', check.type)
      .gte('detected_at', twoHoursAgo)
      .limit(1)
      .maybeSingle();

    if (existing) continue; // already alerted

    // ── 5b. Insert anomaly record ─────────────────────────────────────────
    const sourceData = {
      baseline_hours: bucketValues.length,
      window_hours:   DETECTION_HOURS,
      current_requests: currentRequests,
      baseline_requests: baseRequests,
    };

    const { data: anomaly, error: insertErr } = await supabase
      .from('anomalies')
      .insert({
        organization_id,
        type:           check.type,
        severity:       match.severity,
        metric:         check.metric,
        baseline:       parseFloat(check.baseline.toFixed(6)),
        observed_value: parseFloat(check.observed.toFixed(6)),
        deviation_pct:  parseFloat(deviationPct.toFixed(2)),
        window_hours:   DETECTION_HOURS,
        source_data:    sourceData,
        status:         'open',
        notified:       false,
      })
      .select('id')
      .single();

    if (insertErr) {
      console.error('[anomaly] Insert error:', insertErr.message);
      continue;
    }

    console.log(`[anomaly] ${match.severity} ${check.type} detected for org ${organization_id}: ${deviationPct.toFixed(0)}% above baseline`);
    detected.push({ ...check, severity: match.severity, deviationPct, anomalyId: anomaly.id });

    // ── 5c. In-app alert ──────────────────────────────────────────────────
    const metricLabel = { cost_usd: 'Cost', total_tokens: 'Token Usage', request_count: 'Request Volume' }[check.metric] ?? check.metric;
    const alertTitle  = `Anomaly Detected: ${metricLabel} Spike`;
    const alertMsg    = `Your ${metricLabel.toLowerCase()} in the last hour (${ formatValue(check.observed, check.metric) }) is ${deviationPct.toFixed(0)}% above the 7-day average (${formatValue(check.baseline, check.metric)}). Severity: ${match.severity}.`;

    await supabase.from('alerts').insert({
      organization_id,
      type:     'cost_anomaly',
      severity: match.severity === 'CRITICAL' || match.severity === 'HIGH' ? 'critical' : 'warning',
      title:    alertTitle,
      message:  alertMsg,
      metadata: { anomaly_id: anomaly.id, type: check.type, deviation_pct: deviationPct },
      is_read:  false,
    }).catch(e => console.error('[anomaly] Alert insert error:', e.message));

    // ── 5d. Slack notification ────────────────────────────────────────────
    const { data: orgMembers } = await supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organization_id)
      .eq('status', 'active');

    const memberIds = orgMembers?.map(m => m.user_id) || [];
    let shouldSendSlack = false;
    if (memberIds.length > 0) {
      const { data: prefs } = await supabase
        .from('notification_preferences')
        .select('cost_anomaly_slack')
        .in('user_id', memberIds)
        .eq('cost_anomaly_slack', true)
        .limit(1);
      shouldSendSlack = prefs && prefs.length > 0;
    }

    if (shouldSendSlack) {
      sendSlackAlert({
      organization_id,
      title:    alertTitle,
      message:  alertMsg,
      severity: match.severity,
      fields: {
        'Metric':          metricLabel,
        'Current (1h)':    formatValue(check.observed, check.metric),
        '7-day Average':   formatValue(check.baseline, check.metric),
        'Deviation':       `${deviationPct.toFixed(0)}% above normal`,
        'Severity':        match.severity,
      },
    }).catch(() => {});
    }

    // ── 5e. Webhook notification ──────────────────────────────────────────
    dispatchWebhookEvent(organization_id, 'anomaly.detected', {
      anomaly_id:     anomaly.id,
      type:           check.type,
      severity:       match.severity,
      metric:         check.metric,
      baseline:       check.baseline,
      observed_value: check.observed,
      deviation_pct:  deviationPct,
    }).catch(() => {});

    // Mark as notified
    await supabase
      .from('anomalies')
      .update({ notified: true })
      .eq('id', anomaly.id)
      .catch(() => {});
  }

  return detected;
}

/**
 * Run anomaly detection for all orgs that have the entitlement.
 * Called by the scheduler every hour.
 */
export async function runAnomalyDetectionForAll() {
  console.log('[anomaly] Running detection sweep...');
  const { data: orgs, error } = await supabase
    .from('subscriptions')
    .select('organization_id, plans!inner(system_limits)')
    .eq('status', 'active');

  if (error) {
    console.error('[anomaly] Org fetch error:', error.message);
    return;
  }

  let detected = 0;
  for (const sub of (orgs ?? [])) {
    const features = sub.plans?.system_limits?.features ?? {};
    if (!features.anomaly_detection) continue;

    try {
      const results = await detectAnomaliesForOrg(sub.organization_id);
      detected += results.length;
    } catch (err) {
      console.error(`[anomaly] Detection error for org ${sub.organization_id}:`, err.message);
    }
  }

  console.log(`[anomaly] Sweep complete. ${detected} anomalies detected.`);
}

function formatValue(val, metric) {
  if (metric === 'cost_usd') return `$${Number(val).toFixed(4)}`;
  if (metric === 'total_tokens') return `${Math.round(val).toLocaleString()} tokens`;
  return `${Math.round(val)} requests`;
}

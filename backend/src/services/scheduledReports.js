/**
 * Scheduled Report Engine
 * ────────────────────────
 * Finds recurring reports that are due, generates their snapshot + file,
 * emails the result to configured recipients, and updates scheduling state.
 *
 * Frequencies: 'daily' | 'weekly' | 'monthly'
 *
 * Flow:
 *   1. Query reports WHERE recurring=true AND enabled=true AND next_run_at <= NOW()
 *   2. For each due report:
 *      a. Build fresh data_snapshot from api_usage_logs
 *      b. Generate PDF or XLSX depending on format
 *      c. Email to recipients
 *      d. Update last_run_at, next_run_at, last_run_status
 */

import { supabase } from '../index.js';
import { generatePDF }  from './pdfGenerator.js';
import { generateXLSX } from './xlsxGenerator.js';

const RESEND_API_KEY = () => process.env.RESEND_API_KEY ?? '';
const FROM_ADDRESS   = () => process.env.RESEND_FROM_EMAIL ?? 'Ordisum <notifications@ordisum.com>';
const SITE_URL       = () => process.env.SITE_URL ?? 'https://ordisum.com';

/**
 * Calculate the next run timestamp after a successful execution.
 * @param {'daily'|'weekly'|'monthly'} frequency
 * @param {Date} from - base date (usually now)
 * @returns {Date}
 */
function calcNextRun(frequency, from = new Date()) {
  const d = new Date(from);
  if (frequency === 'daily')  { d.setUTCDate(d.getUTCDate() + 1); }
  if (frequency === 'weekly') { d.setUTCDate(d.getUTCDate() + 7); }
  if (frequency === 'monthly') {
    d.setUTCMonth(d.getUTCMonth() + 1);
    d.setUTCDate(1); // normalize to 1st of month
  }
  return d;
}

/**
 * Build a data snapshot for the report's date range.
 */
async function buildSnapshot(organization_id, { date_range_start, date_range_end, providers }) {
  let query = supabase
    .from('api_usage_logs')
    .select('provider, model, input_tokens, output_tokens, total_tokens, cost_usd, latency_ms, logged_at')
    .eq('organization_id', organization_id)
    .neq('status', 'blocked')
    .order('logged_at', { ascending: false });

  if (date_range_start) query = query.gte('logged_at', date_range_start);
  if (date_range_end)   query = query.lte('logged_at', date_range_end + 'T23:59:59Z');

  const { data: logs, error } = await query.limit(5000);
  if (error) throw error;

  let rows = logs ?? [];
  if (providers?.length) {
    const provSet = new Set(providers.map(p => p.toLowerCase()));
    rows = rows.filter(r => provSet.has((r.provider ?? '').toLowerCase()));
  }

  const totalRequests = rows.length;
  const totalTokens   = rows.reduce((s, r) => s + Number(r.total_tokens ?? 0), 0);
  const totalCost     = rows.reduce((s, r) => s + Number(r.cost_usd     ?? 0), 0);

  const byProvider = rows.reduce((acc, r) => {
    const k = r.provider ?? 'unknown';
    acc[k] ??= { requests: 0, tokens: 0, cost: 0 };
    acc[k].requests += 1;
    acc[k].tokens   += Number(r.total_tokens ?? 0);
    acc[k].cost     += Number(r.cost_usd     ?? 0);
    return acc;
  }, {});

  const byModel = rows.reduce((acc, r) => {
    const k = r.model ?? 'unknown';
    acc[k] ??= { requests: 0, tokens: 0, cost: 0 };
    acc[k].requests += 1;
    acc[k].tokens   += Number(r.total_tokens ?? 0);
    acc[k].cost     += Number(r.cost_usd     ?? 0);
    return acc;
  }, {});

  return {
    generatedAt: new Date().toISOString(),
    totals: { totalRequests, totalTokens, totalCost },
    byProvider,
    byModel,
    rows: rows.slice(0, 1000),
    isEmpty: totalRequests === 0,
  };
}

/**
 * Send a report file to recipients via Resend.
 */
async function emailReport(report, snapshot, fileBuffer, orgName) {
  const key = RESEND_API_KEY();
  if (!key) return; // email disabled

  const recipients = Array.isArray(report.recipients) && report.recipients.length > 0
    ? report.recipients
    : null;

  if (!recipients) {
    console.warn(`[scheduler] Report "${report.name}" has no recipients — skipping email`);
    return;
  }

  const fmt     = (report.format ?? 'JSON').toUpperCase();
  const isCSV   = fmt === 'CSV';
  const isXLSX  = fmt === 'XLSX';
  const isPDF   = fmt === 'PDF';

  let attachment = null;
  if ((isPDF || isXLSX) && fileBuffer) {
    attachment = {
      filename:    `${report.name}.${isPDF ? 'pdf' : 'xlsx'}`,
      content:     fileBuffer.toString('base64'),
      type:        isPDF
        ? 'application/pdf'
        : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
  }

  const html = buildEmailHTML(report, snapshot, orgName);

  const body = {
    from:    FROM_ADDRESS(),
    to:      recipients,
    subject: `[Ordisum] Report Ready: ${report.name}`,
    html,
    ...(attachment ? { attachments: [attachment] } : {}),
  };

  const res = await fetch('https://api.resend.com/emails', {
    method:  'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Resend returned ${res.status}: ${text}`);
  }
  console.log(`[scheduler] Report "${report.name}" emailed to ${recipients.join(', ')}`);
}

function buildEmailHTML(report, snapshot, orgName) {
  const t = snapshot.totals ?? {};
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:32px 16px;">
      <table role="presentation" width="580" align="center" cellpadding="0" cellspacing="0"
             style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1)">
        <tr><td style="background:#6366f1;padding:4px 0;"></td></tr>
        <tr><td style="padding:28px 36px 0;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#6366f1;letter-spacing:.1em;text-transform:uppercase;">Ordisum</p>
        </td></tr>
        <tr><td style="padding:16px 36px 28px;">
          <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#111827;">Your Scheduled Report is Ready</h1>
          <p style="margin:0 0 20px;font-size:14px;color:#6b7280;">Report: <strong>${report.name}</strong> | Org: ${orgName}</p>
          <table width="100%" cellpadding="8" cellspacing="0" style="background:#f3f4f6;border-radius:8px;margin-bottom:20px;">
            <tr>
              <td style="font-size:13px;color:#6b7280;">Total Requests</td>
              <td style="font-size:13px;font-weight:600;color:#111827;">${(t.totalRequests??0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;">Total Tokens</td>
              <td style="font-size:13px;font-weight:600;color:#111827;">${(t.totalTokens??0).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="font-size:13px;color:#6b7280;">Total Cost</td>
              <td style="font-size:13px;font-weight:600;color:#111827;">$${Number(t.totalCost??0).toFixed(4)}</td>
            </tr>
          </table>
          ${snapshot.isEmpty
            ? '<p style="color:#9ca3af;font-size:13px;">No usage data found for this period.</p>'
            : '<p style="color:#374151;font-size:13px;">Full report attached. Log in for detailed breakdown.</p>'
          }
          <a href="${SITE_URL()}/dashboard/reports"
             style="display:inline-block;padding:11px 22px;background:#6366f1;color:#fff;font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">
            View in Dashboard
          </a>
        </td></tr>
        <tr><td style="padding:16px 36px 24px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:11px;color:#9ca3af;">
            This is an automated scheduled report from Ordisum.
            <a href="${SITE_URL()}/dashboard/reports" style="color:#6b7280;">Manage reports →</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

/**
 * Process all due recurring reports.
 * Called by the scheduler (node-cron) on a regular interval.
 */
export async function processDueReports() {
  const now = new Date().toISOString();
  console.log('[scheduler] Checking for due recurring reports...');

  const { data: dueReports, error } = await supabase
    .from('reports')
    .select('id, name, type, format, organization_id, created_by, date_range_start, date_range_end, providers, frequency, recipients')
    .eq('recurring', true)
    .eq('enabled', true)
    .lte('next_run_at', now);

  if (error) {
    console.error('[scheduler] Due reports fetch error:', error.message);
    return;
  }
  if (!dueReports || dueReports.length === 0) {
    console.log('[scheduler] No recurring reports due.');
    return;
  }

  console.log(`[scheduler] ${dueReports.length} recurring report(s) due.`);

  for (const report of dueReports) {
    await processOneReport(report);
  }
}

async function processOneReport(report) {
  const runStart = new Date();
  console.log(`[scheduler] Processing report "${report.name}" (${report.id})`);

  try {
    // ── Get org name for display ──────────────────────────────────────────
    const { data: org } = await supabase
      .from('organizations')
      .select('name')
      .eq('id', report.organization_id)
      .maybeSingle();
    const orgName = org?.name ?? 'Your Organization';

    // ── Compute date range for this run ───────────────────────────────────
    // If report has no explicit date range, use the last period window
    let startDate = report.date_range_start;
    let endDate   = report.date_range_end;

    if (!startDate || !endDate) {
      const periodEnd   = new Date(runStart);
      periodEnd.setUTCDate(periodEnd.getUTCDate() - 1); // yesterday
      const periodStart = new Date(periodEnd);

      if (report.frequency === 'weekly')  { periodStart.setUTCDate(periodStart.getUTCDate() - 6); }
      if (report.frequency === 'monthly') { periodStart.setUTCDate(1); }

      startDate = periodStart.toISOString().slice(0, 10);
      endDate   = periodEnd.toISOString().slice(0, 10);
    }

    // ── Build snapshot ─────────────────────────────────────────────────────
    const snapshot = await buildSnapshot(report.organization_id, {
      date_range_start: startDate,
      date_range_end:   endDate,
      providers: Array.isArray(report.providers) ? report.providers : [],
    });

    // ── Generate file ──────────────────────────────────────────────────────
    const fmt = (report.format ?? 'JSON').toUpperCase();
    let fileBuffer = null;
    const fullReport = { ...report, data_snapshot: snapshot };

    if (fmt === 'PDF') {
      fileBuffer = await generatePDF(fullReport, orgName);
    } else if (fmt === 'XLSX') {
      fileBuffer = await generateXLSX(fullReport, orgName);
    }

    // ── Save snapshot to reports table ─────────────────────────────────────
    // Insert new report record (keeps history) instead of overwriting
    const { data: newReport } = await supabase
      .from('reports')
      .insert({
        organization_id: report.organization_id,
        created_by:      report.created_by,
        name:            `${report.name} — ${startDate} to ${endDate}`,
        type:            report.type,
        format:          report.format,
        status:          'ready',
        date_range_start: startDate,
        date_range_end:   endDate,
        providers:       report.providers,
        recurring:       false, // this is the generated copy
        data_snapshot:   snapshot,
        enabled:         true,
      })
      .select('id')
      .single();

    // ── Email recipients ───────────────────────────────────────────────────
    await emailReport(report, snapshot, fileBuffer, orgName);

    // ── Dispatch webhook event ─────────────────────────────────────────────
    const { dispatchWebhookEvent } = await import('../utils/webhookDispatcher.js');
    dispatchWebhookEvent(report.organization_id, 'report.generated', {
      report_id:   newReport?.id ?? report.id,
      report_name: report.name,
      format:      report.format,
      period:      `${startDate} to ${endDate}`,
    }).catch(() => {});

    // ── Update schedule ────────────────────────────────────────────────────
    const nextRun = calcNextRun(report.frequency, runStart);
    await supabase
      .from('reports')
      .update({
        last_run_at:     runStart.toISOString(),
        next_run_at:     nextRun.toISOString(),
        last_run_status: 'success',
        updated_at:      new Date().toISOString(),
      })
      .eq('id', report.id);

    console.log(`[scheduler] Report "${report.name}" completed. Next run: ${nextRun.toISOString()}`);

  } catch (err) {
    console.error(`[scheduler] Report "${report.name}" FAILED:`, err.message);

    await supabase
      .from('reports')
      .update({
        last_run_at:     runStart.toISOString(),
        last_run_status: 'failed',
        error_message:   err.message,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', report.id);
  }
}

/** Set next_run_at when a recurring report is saved for the first time */
export function getFirstRunAt(frequency, fromNow = new Date()) {
  return calcNextRun(frequency, fromNow);
}

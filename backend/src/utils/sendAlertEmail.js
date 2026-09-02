/**
 * Shared Resend email utility.
 * Used by alertRules.js and aggregate-usage (via backend) to dispatch
 * email notifications for budget threshold alerts.
 *
 * Set RESEND_API_KEY in your backend .env to enable email dispatch.
 * When the key is absent, emails are silently skipped (non-fatal).
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const FROM_ADDRESS = process.env.ALERT_FROM_EMAIL || 'alerts@ordisum.com';
const SITE_URL = process.env.SITE_URL || 'https://app.ordisum.com';

/**
 * Send an alert email via Resend.
 * @param {Object} opts
 * @param {string} opts.to           - Recipient email address
 * @param {string} opts.subject      - Email subject
 * @param {string} opts.title        - Alert title (shown in email body)
 * @param {string} opts.message      - Alert message body
 * @param {'info'|'warning'|'critical'} opts.severity
 */
export async function sendAlertEmail({ to, subject, title, message, severity = 'info' }) {
  if (!RESEND_API_KEY) return; // Email disabled — skip silently

  const severityColor = {
    info: '#3b82f6',
    warning: '#f59e0b',
    critical: '#ef4444',
  }[severity] ?? '#3b82f6';

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:32px 16px;">
      <table role="presentation" width="600" align="center" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header bar -->
        <tr><td style="background:${severityColor};padding:4px 0;"></td></tr>
        <!-- Logo row -->
        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0;font-size:14px;font-weight:600;color:#111827;letter-spacing:0.05em;text-transform:uppercase;">
            Ordisum
          </p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:24px 40px;">
          <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#111827;">${title}</h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">${message}</p>
          <a href="${SITE_URL}/dashboard/alerts"
             style="display:inline-block;padding:12px 24px;background:${severityColor};color:#ffffff;
                    font-weight:600;font-size:14px;text-decoration:none;border-radius:8px;">
            View Alerts
          </a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:24px 40px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            This alert was triggered by your Ordisum budget rules.
            <a href="${SITE_URL}/dashboard/alert-rules" style="color:#6b7280;">Manage alert rules →</a>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `Ordisum Alerts <${FROM_ADDRESS}>`,
        to: [to],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      console.error('[resend] Failed to send alert email:', res.status, body);
    }
  } catch (err) {
    // Non-fatal — email dispatch failure should never crash the alert pipeline
    console.error('[resend] Error dispatching alert email:', err.message);
  }
}

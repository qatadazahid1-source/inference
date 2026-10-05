#!/usr/bin/env node
/**
 * Ordisum — Resend Email Integration Test
 * ─────────────────────────────────────────
 * Run with:
 *   node backend/scripts/test-resend.js <recipient@gmail.com>
 *
 * Reads RESEND_API_KEY and RESEND_FROM_EMAIL from backend/.env
 */

import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load backend/.env explicitly
config({ path: path.resolve(__dirname, '../.env') });

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.RESEND_FROM_EMAIL || 'Ordisum <notifications@ordisum.com>';

const to = process.argv[2];

if (!to) {
  console.error('Usage: node backend/scripts/test-resend.js <your-email@gmail.com>');
  process.exit(1);
}

if (!RESEND_API_KEY) {
  console.error('RESEND_API_KEY not found in backend/.env');
  process.exit(1);
}

console.log(`\nSending test email...`);
console.log(`    From : ${FROM}`);
console.log(`    To   : ${to}`);
console.log(`    Key  : re_****${RESEND_API_KEY.slice(-6)}\n`);

const sentAt = new Date().toUTCString();

const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,system-ui,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td style="padding:40px 16px;">
      <table role="presentation" width="560" align="center" cellpadding="0" cellspacing="0"
             style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);">
        <tr><td style="background:#6366f1;padding:4px 0;"></td></tr>
        <tr><td style="padding:32px 40px 0;">
          <p style="margin:0;font-size:13px;font-weight:700;color:#6366f1;letter-spacing:0.1em;text-transform:uppercase;">
            Ordisum
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px 32px;">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">
            Email Integration Test
          </h1>
          <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#374151;">
            Resend email integration is working correctly.
          </p>
          <p style="margin:0;font-size:14px;line-height:2;color:#374151;">
            Resend API — Working<br/>
            Domain (ordisum.com) — Working<br/>
            Sender — Working<br/>
            Ordisum to Resend — Connected<br/>
            Sent at: ${sentAt}
          </p>
        </td></tr>
        <tr><td style="padding:20px 40px 28px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            This is a test email from Ordisum.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${RESEND_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: FROM,
    to: [to],
    subject: 'Ordisum Email Test',
    html,
  }),
});

const body = await res.json();

if (res.ok) {
  console.log('Email sent successfully!');
  console.log(`    Resend Email ID : ${body.id}`);
  console.log(`\nCheck your inbox (and Spam / Promotions) at: ${to}\n`);
} else {
  console.error(`Resend API returned ${res.status}:`);
  console.error(JSON.stringify(body, null, 2));
  process.exit(1);
}

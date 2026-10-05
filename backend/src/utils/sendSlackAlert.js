/**
 * Slack Alert Service
 * ───────────────────
 * Dispatches Slack Block Kit messages to an organization's configured
 * Slack channel using the bot token. The bot token is stored encrypted in
 * the `slack_integrations` table using the existing AES-256-GCM encryption.
 *
 * Never logs or returns the decrypted token.
 */

import { supabase } from '../index.js';
import { decrypt } from './encryption.js';

const SEVERITY_EMOJI = {
  info:     'ℹ️',
  warning:  '⚠️',
  critical: '🚨',
  LOW:      'ℹ️',
  MEDIUM:   '⚠️',
  HIGH:     '🔴',
  CRITICAL: '🚨',
};

const SEVERITY_COLOR = {
  info:     '#3b82f6',
  warning:  '#f59e0b',
  critical: '#ef4444',
  LOW:      '#3b82f6',
  MEDIUM:   '#f59e0b',
  HIGH:     '#ef4444',
  CRITICAL: '#7c3aed',
};

/**
 * Send a Slack notification to the org's configured channel.
 *
 * @param {Object} opts
 * @param {string} opts.organization_id
 * @param {string} opts.title          - Alert title
 * @param {string} opts.message        - Alert body
 * @param {'info'|'warning'|'critical'|'LOW'|'MEDIUM'|'HIGH'|'CRITICAL'} opts.severity
 * @param {Object} [opts.fields]       - Extra key-value fields to include in the Slack message
 * @returns {Promise<boolean>}         - true if sent, false if skipped/failed
 */
export async function sendSlackAlert({ organization_id, title, message, severity = 'info', fields = {} }) {
  if (!organization_id) return false;

  // 1. Fetch the org's Slack integration (encrypted bot token and channel ID)
  const { data: integration, error } = await supabase
    .from('slack_integrations')
    .select('bot_token_enc, channel_id, channel_name, workspace_name')
    .eq('organization_id', organization_id)
    .eq('is_active', true)
    .maybeSingle();

  if (error) {
    console.error('[slack] DB fetch error:', error.message);
    return false;
  }
  if (!integration || !integration.channel_id) return false; // org has no active Slack channel configured

  // 2. Decrypt the bot token (never log it)
  let botToken;
  try {
    botToken = decrypt(integration.bot_token_enc);
  } catch (decryptErr) {
    console.error('[slack] Failed to decrypt bot token for org:', organization_id);
    return false;
  }

  if (!botToken || !botToken.startsWith('xoxb-')) {
    console.error('[slack] Decrypted bot token is invalid for org:', organization_id);
    return false;
  }

  // 3. Build Slack Block Kit message
  const emoji = SEVERITY_EMOJI[severity] ?? 'ℹ️';
  const color = SEVERITY_COLOR[severity] ?? '#3b82f6';

  const extraFields = Object.entries(fields).map(([key, value]) => ({
    type: 'mrkdwn',
    text: `*${key}*\n${value}`,
  }));

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `${emoji} Ordisum Alert`, emoji: true },
    },
    {
      type: 'section',
      text: { type: 'mrkdwn', text: `*${title}*\n${message}` },
    },
  ];

  if (extraFields.length > 0) {
    blocks.push({
      type: 'section',
      fields: extraFields.slice(0, 10), // Slack allows max 10 fields
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Ordisum | ${new Date().toUTCString()}`,
      },
    ],
  });

  const payload = {
    channel: integration.channel_id,
    attachments: [
      {
        color,
        blocks,
        fallback: `${emoji} ${title}: ${message}`, // plain-text fallback for notifications
      },
    ],
  };

  // 4. POST to Slack
  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Bearer ${botToken}`
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000), // 10s timeout — never block main flow
    });

    const body = await res.json();

    if (!res.ok || !body.ok) {
      console.error(`[slack] Slack chat.postMessage failed for org ${organization_id}:`, body.error || body);
      return false;
    }

    console.log(`[slack] Alert sent to org ${organization_id} channel ${integration.channel_name ?? 'unknown'}`);
    return true;
  } catch (err) {
    // Non-fatal — Slack failure must never crash the alert/budget pipeline
    console.error(`[slack] Dispatch error for org ${organization_id}:`, err.message);
    return false;
  }
}

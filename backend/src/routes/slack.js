/**
 * Slack Integration Routes
 * ─────────────────────────
 * GET    /api/slack              — get org's current Slack config
 * GET    /api/slack/oauth/init   — start OAuth flow
 * GET    /api/slack/oauth/callback — handle Slack OAuth redirect
 * GET    /api/slack/channels     — list available channels using bot token
 * POST   /api/slack/channel      — save selected channel
 * DELETE /api/slack              — disconnect Slack integration
 * POST   /api/slack/test         — send a test Slack message
 *
 * Entitlement required: slack_alerts
 * The bot token is encrypted at rest using the existing AES-256-GCM system.
 * The decrypted token is NEVER returned to the client.
 */

import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { sendSlackAlert } from '../utils/sendSlackAlert.js';

const router = express.Router();

async function getUserOrgId(userId) {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .limit(1).maybeSingle();

  if (error || !data) {
    const { data: org } = await supabase
      .from('organizations').select('id')
      .eq('user_id', userId).limit(1).maybeSingle();
    if (org) return org.id;
    throw new Error('No active organization found');
  }
  return data.organization_id;
}

// GET /api/slack — returns current Slack config (masked, no raw token)
router.get('/', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'slack_alerts', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('slack_integrations')
      .select('id, channel_name, channel_id, workspace_name, team_id, is_active, created_at, updated_at')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (error) throw error;

    res.json(data ?? null);
  } catch (err) {
    console.error('[slack] GET error:', err.message);
    res.status(500).json({ error: 'Failed to fetch Slack integration' });
  }
});

// GET /api/slack/oauth/init — Start Slack OAuth
router.get('/oauth/init', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({ error: 'Slack Alerts not available' });
    }

    const organization_id = await getUserOrgId(req.user.id);
    const clientId = process.env.SLACK_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: 'Slack integration is not configured on the server.' });
    }

    // Generate state containing organization info securely (encrypted)
    const statePayload = JSON.stringify({ orgId: organization_id, userId: req.user.id, exp: Date.now() + 15 * 60 * 1000 });
    const state = encrypt(statePayload);

    const scopes = ['chat:write', 'chat:write.public', 'channels:read', 'groups:read'];
    
    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.append('client_id', clientId);
    slackAuthUrl.searchParams.append('scope', scopes.join(','));
    slackAuthUrl.searchParams.append('state', state);
    
    // We do NOT set redirect_uri here, so Slack uses the one configured in the App Dashboard
    // But if we want to ensure it, we can:
    // slackAuthUrl.searchParams.append('redirect_uri', 'https://your-domain/api/slack/oauth/callback');

    res.json({ url: slackAuthUrl.toString() });
  } catch (err) {
    console.error('[slack] OAuth Init error:', err.message);
    res.status(500).json({ error: 'Failed to initiate Slack OAuth' });
  }
});

// GET /api/slack/oauth/callback — Handle Slack OAuth redirect
router.get('/oauth/callback', async (req, res) => {
  try {
    const { code, state, error: slackError } = req.query;

    if (slackError) {
      console.error('[slack] OAuth returned error:', slackError);
      return res.redirect(`${process.env.FRONTEND_URL}/settings/slack?slack_error=` + slackError);
    }

    if (!code || !state) {
      return res.status(400).send('Missing code or state');
    }

    // Validate state
    let stateData;
    try {
      const decryptedState = decrypt(state);
      stateData = JSON.parse(decryptedState);
      if (stateData.exp < Date.now()) {
        throw new Error('OAuth state expired');
      }
    } catch (e) {
      console.error('[slack] Invalid OAuth state:', e.message);
      return res.status(400).send('Invalid or expired OAuth state');
    }

    const organization_id = stateData.orgId;

    // Exchange code for access token
    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: process.env.SLACK_CLIENT_ID,
        client_secret: process.env.SLACK_CLIENT_SECRET,
        code
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('[slack] OAuth token exchange failed:', tokenData.error);
      return res.redirect(`${process.env.FRONTEND_URL}/settings/slack?slack_error=token_exchange_failed`);
    }

    const botToken = tokenData.access_token;
    const teamId = tokenData.team.id;
    const teamName = tokenData.team.name;

    const bot_token_enc = encrypt(botToken);

    // Save to DB (is_active is false until a channel is selected, unless they already had one)
    const { error: dbError } = await supabase
      .from('slack_integrations')
      .upsert({
        organization_id,
        bot_token_enc,
        team_id: teamId,
        workspace_name: teamName,
        is_active: false, // Must select a channel next
        created_by: stateData.userId,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'organization_id' });

    if (dbError) throw dbError;

    // Redirect to frontend Slack settings page to select a channel
    res.redirect(`${process.env.FRONTEND_URL}/settings/slack?slack_connected=true`);

  } catch (err) {
    console.error('[slack] OAuth Callback error:', err.message);
    res.status(500).send('Failed to connect Slack');
  }
});

// GET /api/slack/channels — list available channels for the connected workspace
router.get('/channels', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE'
      });
    }

    const organization_id = await getUserOrgId(req.user.id);
    const { data: integration, error } = await supabase
      .from('slack_integrations')
      .select('bot_token_enc')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (error || !integration?.bot_token_enc) {
      return res.status(404).json({ error: 'No active Slack connection found' });
    }

    const token = decrypt(integration.bot_token_enc);

    // Fetch channels from Slack
    const slackRes = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    
    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error('[slack] Failed to fetch channels:', slackData.error);
      return res.status(500).json({ error: 'Failed to fetch channels from Slack' });
    }

    const channels = slackData.channels.map(c => ({
      id: c.id,
      name: c.name,
      is_private: c.is_private
    }));

    res.json({ channels });
  } catch (err) {
    console.error('[slack] Get channels error:', err.message);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// POST /api/slack/channel — save selected channel
router.post('/channel', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE'
      });
    }

    const { channel_id, channel_name } = req.body;
    if (!channel_id || !channel_name) {
      return res.status(400).json({ error: 'channel_id and channel_name are required' });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const { data, error } = await supabase
      .from('slack_integrations')
      .update({
        channel_id,
        channel_name,
        is_active: true,
        updated_at: new Date().toISOString()
      })
      .eq('organization_id', organization_id)
      .select('id, channel_name, channel_id, workspace_name, is_active, updated_at')
      .single();

    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('[slack] Set channel error:', err.message);
    res.status(500).json({ error: 'Failed to set channel' });
  }
});

// DELETE /api/slack — disconnect Slack
router.delete('/', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'slack_alerts', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const { error } = await supabase
      .from('slack_integrations')
      .delete()
      .eq('organization_id', organization_id);

    if (error) throw error;

    res.status(204).send();
  } catch (err) {
    console.error('[slack] DELETE error:', err.message);
    res.status(500).json({ error: 'Failed to disconnect Slack integration' });
  }
});

// POST /api/slack/test — send a test message
router.post('/test', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'slack_alerts', upgrade_required: true },
      });
    }

    const organization_id = await getUserOrgId(req.user.id);

    const sent = await sendSlackAlert({
      organization_id,
      title:    'Ordisum Slack Test',
      message:  'Your Slack integration is working correctly. You will receive budget and anomaly alerts here.',
      severity: 'info',
      fields: {
        'Status': 'Connected ✅',
        'Sent at': new Date().toUTCString(),
      },
    });

    if (!sent) {
      return res.status(400).json({
        error: 'Failed to send test Slack message. Check your channel access.',
      });
    }

    res.json({ success: true, message: 'Test Slack message sent successfully.' });
  } catch (err) {
    console.error('[slack] POST /test error:', err.message);
    res.status(500).json({ error: 'Failed to send test Slack message' });
  }
});

export default router;

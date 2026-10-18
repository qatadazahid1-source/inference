/**
 * Slack Integration Routes
 * ─────────────────────────
 * GET    /api/slack              — get org's current Slack config
 * GET    /api/slack/oauth/init   — start OAuth flow
 * GET    /api/slack/oauth/callback — handle Slack OAuth redirect (Public, state-verified)
 * GET    /api/slack/channels     — list available channels using bot token
 * POST   /api/slack/channel      — save selected channel
 * DELETE /api/slack              — disconnect Slack integration and revoke token
 * POST   /api/slack/test         — send a test Slack message
 *
 * Entitlement required: slack_alerts
 * The bot token is encrypted at rest using AES-256-GCM.
 * The decrypted token is NEVER returned to the client or logged.
 */

import express from 'express';
import { supabase } from '../index.js';
import { attachEntitlements } from '../middleware/requireEntitlements.js';
import { encrypt, decrypt } from '../utils/encryption.js';
import { sendSlackAlert } from '../utils/sendSlackAlert.js';
import { createSlackOAuthState, consumeSlackOAuthState } from '../services/slackOAuthStateStore.js';

const router = express.Router();

/**
 * Determine registered Slack redirect URI.
 * Matches the URL configured in the Slack App Dashboard.
 */
export function getSlackRedirectUri(req) {
  if (process.env.SLACK_REDIRECT_URI) {
    return process.env.SLACK_REDIRECT_URI;
  }
  if (process.env.API_BASE_URL) {
    return `${process.env.API_BASE_URL.replace(/\/$/, '')}/api/slack/oauth/callback`;
  }
  if (process.env.BACKEND_URL) {
    return `${process.env.BACKEND_URL.replace(/\/$/, '')}/api/slack/oauth/callback`;
  }
  if (req) {
    const host = req.get('x-forwarded-host') || req.get('host');
    const proto = req.get('x-forwarded-proto') || req.protocol || 'https';
    if (host) {
      return `${proto}://${host}/api/slack/oauth/callback`;
    }
  }
  return 'https://api.ordisum.com/api/slack/oauth/callback';
}

/**
 * Determine Frontend redirect base URL.
 */
export function getFrontendUrl(req) {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/$/, '');
  }
  if (process.env.VITE_SITE_URL) {
    return process.env.VITE_SITE_URL.replace(/\/$/, '');
  }
  return 'https://ordisum.com';
}

/**
 * Resolve active organization ID for an authenticated user.
 */
export async function getUserOrgId(userId) {
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
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
        details: { feature: 'slack_alerts', upgrade_required: true },
      });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.status(500).json({ error: 'Slack integration is not configured on the server.' });
    }

    const organization_id = await getUserOrgId(req.user.id);

    // Generate single-use, unpredictable, cryptographically secure state
    const state = await createSlackOAuthState({
      userId: req.user.id,
      organizationId: organization_id,
      ttlMs: 10 * 60 * 1000, // 10 minutes
    });

    const redirectUri = getSlackRedirectUri(req);
    const scopes = ['chat:write', 'chat:write.public', 'channels:read', 'groups:read'];

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.append('client_id', clientId);
    slackAuthUrl.searchParams.append('scope', scopes.join(','));
    slackAuthUrl.searchParams.append('state', state);
    slackAuthUrl.searchParams.append('redirect_uri', redirectUri);

    res.json({ url: slackAuthUrl.toString() });
  } catch (err) {
    console.error('[slack] OAuth Init error:', err.message);
    res.status(500).json({ error: 'Failed to initiate Slack OAuth' });
  }
});

// GET /api/slack/oauth/callback — Handle Slack OAuth redirect (Public route, state-verified)
router.get('/oauth/callback', async (req, res) => {
  const frontendUrl = getFrontendUrl(req);

  try {
    const { code, state, error: slackError } = req.query;

    // 1. Handle Slack authorization denial or error parameter gracefully
    if (slackError) {
      console.warn('[slack] OAuth redirected with error from Slack:', slackError);
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=${encodeURIComponent(slackError)}`);
    }

    // 2. Validate essential callback parameters
    if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
      console.warn('[slack] Missing code or state in OAuth callback');
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=missing_parameters`);
    }

    // 3. Atomically validate and consume single-use state token
    const stateResult = await consumeSlackOAuthState(state);
    if (!stateResult.valid) {
      console.warn('[slack] Invalid or expired OAuth state token:', stateResult.error);
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=${encodeURIComponent(stateResult.error || 'invalid_or_expired_state')}`);
    }

    // Security: Only associate with organization ID verified from server-stored state, never untrusted input
    const { userId, organizationId } = stateResult.data;

    // 4. Server-side code exchange with Slack oauth.v2.access
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    const redirectUri = getSlackRedirectUri(req);

    if (!clientId || !clientSecret) {
      console.error('[slack] Missing Slack Client credentials during token exchange');
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=callback_failed`);
    }

    const tokenRes = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.ok) {
      console.error('[slack] OAuth token exchange failed with Slack error:', tokenData.error);
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=token_exchange_failed`);
    }

    const botToken = tokenData.access_token;
    const teamId = tokenData.team?.id;
    const teamName = tokenData.team?.name || 'Slack Workspace';

    if (!botToken) {
      console.error('[slack] OAuth response missing access_token');
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=token_exchange_failed`);
    }

    // Encrypt bot token at rest using AES-256-GCM
    const bot_token_enc = encrypt(botToken);

    // 5. Securely persist integration in database associated with correct tenant
    const { error: dbError } = await supabase
      .from('slack_integrations')
      .upsert(
        {
          organization_id: organizationId,
          bot_token_enc,
          team_id: teamId,
          workspace_name: teamName,
          is_active: false, // Inactive until channel is selected
          created_by: userId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'organization_id' }
      );

    if (dbError) {
      console.error('[slack] DB error saving Slack integration:', dbError.message);
      return res.redirect(`${frontendUrl}/settings/slack?slack_error=callback_failed`);
    }

    // 6. Redirect to frontend with success status and workspace name
    return res.redirect(`${frontendUrl}/settings/slack?slack_connected=true&workspace_name=${encodeURIComponent(teamName)}`);
  } catch (err) {
    console.error('[slack] Unexpected OAuth Callback error:', err.message);
    return res.redirect(`${frontendUrl}/settings/slack?slack_error=callback_failed`);
  }
});

// GET /api/slack/channels — list available channels for the connected workspace
router.get('/channels', attachEntitlements, async (req, res) => {
  try {
    if (!req.entitlements.hasFeature('slack_alerts')) {
      return res.status(403).json({
        error: 'Slack Alerts are not available on your plan.',
        code: 'FEATURE_NOT_AVAILABLE',
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
    const slackRes = await fetch(
      'https://slack.com/api/conversations.list?types=public_channel,private_channel&exclude_archived=true&limit=100',
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    const slackData = await slackRes.json();
    if (!slackData.ok) {
      console.error('[slack] Failed to fetch channels:', slackData.error);
      return res.status(500).json({ error: 'Failed to fetch channels from Slack' });
    }

    const channels = (slackData.channels || []).map((c) => ({
      id: c.id,
      name: c.name,
      is_private: c.is_private,
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
        code: 'FEATURE_NOT_AVAILABLE',
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
        updated_at: new Date().toISOString(),
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

// DELETE /api/slack — disconnect Slack integration and revoke bot token
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

    // Retrieve token to revoke it with Slack API
    const { data: integration } = await supabase
      .from('slack_integrations')
      .select('bot_token_enc')
      .eq('organization_id', organization_id)
      .maybeSingle();

    if (integration?.bot_token_enc) {
      try {
        const token = decrypt(integration.bot_token_enc);
        if (token) {
          await fetch('https://slack.com/api/auth.revoke', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Bearer ${token}`,
            },
          });
        }
      } catch (revokeErr) {
        console.warn('[slack] Failed to revoke Slack token during disconnect:', revokeErr.message);
      }
    }

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
      title: 'Ordisum Slack Test',
      message: 'Your Slack integration is working correctly. You will receive budget and anomaly alerts here.',
      severity: 'info',
      fields: {
        Status: 'Connected ✅',
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

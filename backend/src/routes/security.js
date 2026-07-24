import express from 'express';
import crypto from 'crypto';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { supabase } from '../index.js';

const router = express.Router();

function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10 hex chars
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`;
  });
}

// Minimal User-Agent parsing — no external dependency. Good enough to show
// "Chrome on macOS" style labels; not meant to be exhaustive.
function parseUserAgent(ua = '') {
  let browser = 'Unknown browser';
  if (/Edg\//.test(ua)) browser = 'Edge';
  else if (/Chrome\//.test(ua)) browser = 'Chrome';
  else if (/Firefox\//.test(ua)) browser = 'Firefox';
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';

  let os = 'Unknown OS';
  if (/Windows/.test(ua)) os = 'Windows';
  else if (/Mac OS X/.test(ua)) os = 'macOS';
  else if (/Android/.test(ua)) os = 'Android';
  else if (/iPhone|iPad|iOS/.test(ua)) os = 'iOS';
  else if (/Linux/.test(ua)) os = 'Linux';

  const isMobile = /Mobile|Android|iPhone/.test(ua);
  const deviceName = `${browser} on ${os}${isMobile ? ' (Mobile)' : ''}`;

  return { browser, os, deviceName };
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.ip || req.socket?.remoteAddress || null;
}

// POST /api/security/track-login — called once right after a successful
// Google OAuth sign-in (see Callback.tsx). Populates login_history and
// security_sessions, which are otherwise never written to anywhere in the
// app — Supabase's own OAuth flow doesn't touch these custom tables.
//
// Known simplification: this marks the newly-created session row as the
// only `is_current = true` row for the user, flipping any previous rows to
// false. If the same user is logged in on two devices at once, whichever
// logged in most recently is the one "protected" from revoke — the other
// device's row would show as revocable even though it's still an active
// session there. A cleaner fix needs a per-device/browser session token
// persisted client-side (e.g. in localStorage) so revoke logic can tell overlapping
// devices apart; flagging rather than quietly shipping something that looks
// more precise than it is.
router.post('/track-login', async (req, res) => {
  try {
    const ip = getClientIp(req);
    const { browser, os, deviceName } = parseUserAgent(req.headers['user-agent']);

    await supabase.from('login_history').insert({
      user_id: req.user.id,
      ip_address: ip,
      device: deviceName,
      status: 'success',
    });

    await supabase
      .from('security_sessions')
      .update({ is_current: false })
      .eq('user_id', req.user.id)
      .is('revoked_at', null);

    const { error: sessionError } = await supabase.from('security_sessions').insert({
      user_id: req.user.id,
      device_name: deviceName,
      browser,
      os,
      ip_address: ip,
      user_agent: req.headers['user-agent'] || null,
      is_current: true,
      last_active_at: new Date().toISOString(),
    });

    if (sessionError) throw sessionError;

    res.json({ data: { success: true } });
  } catch (err) {
    // Never let tracking failures block login itself — log and move on.
    console.error('[security] track-login error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Two-Factor Authentication ──────────────────────────────────────
// Backed by the real `two_factor_auth` table (is_enabled, method,
// totp_secret, backup_codes, backup_codes_used, verified_at).

// GET /api/security/2fa — current status (never returns the raw secret once verified)
router.get('/2fa', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('two_factor_auth')
      .select('is_enabled, method, verified_at, backup_codes, backup_codes_used')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (error) throw error;

    res.json({
      data: {
        isEnabled: data?.is_enabled ?? false,
        method: data?.method ?? null,
        verifiedAt: data?.verified_at ?? null,
        backupCodesRemaining: data ? (data.backup_codes?.length ?? 0) - (data.backup_codes_used ?? 0) : 0,
      },
    });
  } catch (err) {
    console.error('[security] GET /2fa error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/2fa/start — generates a TOTP secret + QR code, but does
// NOT enable 2FA yet. is_enabled flips to true only after /2fa/verify.
router.post('/2fa/start', async (req, res) => {
  try {
    const secret = authenticator.generateSecret();
    const { data: userRow } = await supabase.from('users').select('email').eq('id', req.user.id).single();
    const otpauth = authenticator.keyuri(userRow?.email || req.user.id, 'Inference Intelligence', secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    const { error } = await supabase
      .from('two_factor_auth')
      .upsert(
        { user_id: req.user.id, method: 'totp', totp_secret: secret, is_enabled: false, verified_at: null },
        { onConflict: 'user_id' }
      );

    if (error) throw error;

    res.json({ data: { qrCodeDataUrl, secret } });
  } catch (err) {
    console.error('[security] POST /2fa/start error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/2fa/verify — confirms the 6-digit code, enables 2FA, issues backup codes
router.post('/2fa/verify', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code || String(code).length !== 6) {
      return res.status(400).json({ error: 'A 6-digit code is required' });
    }

    const { data: row, error: fetchError } = await supabase
      .from('two_factor_auth')
      .select('totp_secret')
      .eq('user_id', req.user.id)
      .maybeSingle();

    if (fetchError || !row?.totp_secret) {
      return res.status(400).json({ error: 'No pending 2FA setup found. Start setup first.' });
    }

    const isValid = authenticator.verify({ token: String(code), secret: row.totp_secret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }

    const backupCodes = generateBackupCodes();

    const { error } = await supabase
      .from('two_factor_auth')
      .update({ is_enabled: true, verified_at: new Date().toISOString(), backup_codes: backupCodes, backup_codes_used: 0 })
      .eq('user_id', req.user.id);

    if (error) throw error;

    // Backup codes are only ever returned once, at creation time.
    res.json({ data: { success: true, backupCodes } });
  } catch (err) {
    console.error('[security] POST /2fa/verify error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/2fa/disable
router.post('/2fa/disable', async (req, res) => {
  try {
    const { error } = await supabase
      .from('two_factor_auth')
      .update({ is_enabled: false, totp_secret: null, backup_codes: null, backup_codes_used: 0, verified_at: null })
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('[security] POST /2fa/disable error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/2fa/backup-codes/regenerate
router.post('/2fa/backup-codes/regenerate', async (req, res) => {
  try {
    const backupCodes = generateBackupCodes();
    const { error } = await supabase
      .from('two_factor_auth')
      .update({ backup_codes: backupCodes, backup_codes_used: 0 })
      .eq('user_id', req.user.id)
      .eq('is_enabled', true);

    if (error) throw error;
    res.json({ data: { backupCodes } });
  } catch (err) {
    console.error('[security] regenerate backup codes error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Active Sessions ─────────────────────────────────────────────────
// Backed by the real `security_sessions` table.

// GET /api/security/sessions
router.get('/sessions', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('security_sessions')
      .select('*')
      .eq('user_id', req.user.id)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .order('last_active_at', { ascending: false });

    if (error) throw error;
    res.json({ data });
  } catch (err) {
    console.error('[security] GET /sessions error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/sessions/:id/revoke
router.post('/sessions/:id/revoke', async (req, res) => {
  try {
    const { data: session, error: fetchError } = await supabase
      .from('security_sessions')
      .select('id, user_id, is_current')
      .eq('id', req.params.id)
      .single();

    if (fetchError || !session) return res.status(404).json({ error: 'Session not found' });
    if (session.user_id !== req.user.id) return res.status(403).json({ error: 'Not your session' });
    if (session.is_current) return res.status(400).json({ error: 'Use logout instead of revoking the current session' });

    const { error } = await supabase
      .from('security_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('[security] revoke session error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/security/sessions/revoke-all — revokes every session except the current one
router.post('/sessions/revoke-all', async (req, res) => {
  try {
    const { error } = await supabase
      .from('security_sessions')
      .update({ revoked_at: new Date().toISOString() })
      .eq('user_id', req.user.id)
      .eq('is_current', false)
      .is('revoked_at', null);

    if (error) throw error;
    res.json({ data: { success: true } });
  } catch (err) {
    console.error('[security] revoke-all error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Login History ───────────────────────────────────────────────────
// GET /api/security/login-history?limit=5&offset=0
router.get('/login-history', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 50);
    const offset = parseInt(req.query.offset, 10) || 0;

    const { data, error, count } = await supabase
      .from('login_history')
      .select('*', { count: 'exact' })
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) throw error;
    res.json({ data, total: count });
  } catch (err) {
    console.error('[security] GET /login-history error:', err.message, err);
    res.status(500).json({ error: err.message });
  }
});

export default router;

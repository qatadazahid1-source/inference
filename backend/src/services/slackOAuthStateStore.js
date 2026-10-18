import crypto from 'node:crypto';
import { supabase } from '../index.js';

/**
 * Server-side Slack OAuth State Store
 * ────────────────────────────────────
 * Database-backed, multi-instance authoritative state store.
 *
 * Uses Supabase `slack_oauth_states` table as the sole source of truth.
 * All state validation and single-use consumption is performed via an atomic,
 * conditional database update:
 *   UPDATE slack_oauth_states
 *   SET status = 'consumed', consumed_at = now()
 *   WHERE state = $1 AND status = 'pending' AND expires_at > now()
 *   RETURNING user_id, organization_id
 *
 * This guarantees strict replay and CSRF protection across multiple server instances,
 * worker processes, and server restarts.
 */

/**
 * Create a new single-use OAuth state token in the authoritative database.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated user ID initiating the OAuth flow
 * @param {string} params.organizationId - Target organization ID for the Slack installation
 * @param {number} [params.ttlMs=600000] - Time to live in ms (default: 10 minutes)
 * @returns {Promise<string>} The generated state token
 */
export async function createSlackOAuthState({ userId, organizationId, ttlMs = 10 * 60 * 1000 }) {
  if (!userId || !organizationId) {
    throw new Error('userId and organizationId are required to create an OAuth state.');
  }

  if (!supabase) {
    throw new Error('Database client is not available to persist OAuth state.');
  }

  // Generate 256 bits of cryptographically secure randomness (64 hex characters)
  const state = crypto.randomBytes(32).toString('hex');
  const now = Date.now();
  const expiresAt = now + ttlMs;

  const { error } = await supabase.from('slack_oauth_states').insert({
    state,
    user_id: userId,
    organization_id: organizationId,
    status: 'pending',
    created_at: new Date(now).toISOString(),
    expires_at: new Date(expiresAt).toISOString(),
  });

  if (error) {
    console.error('[slack-oauth-state] Failed to persist state to database:', error.message);
    throw new Error(`Failed to persist OAuth state to database: ${error.message}`);
  }

  return state;
}

/**
 * Validates and atomically consumes an OAuth state token in the authoritative database.
 *
 * Uses conditional update (`status = 'pending' AND expires_at > now()`) so only
 * the very first concurrent request can transition the state from pending to consumed.
 * Subsequent attempts return 0 updated rows and are rejected as replayed or expired.
 *
 * @param {string} state - The state token from the OAuth callback
 * @returns {Promise<{ valid: boolean, error?: string, data?: { userId: string, organizationId: string } }>}
 */
export async function consumeSlackOAuthState(state) {
  if (!state || typeof state !== 'string') {
    return { valid: false, error: 'missing_or_invalid_state' };
  }

  if (!supabase) {
    console.error('[slack-oauth-state] Database client unavailable during state consumption');
    return { valid: false, error: 'database_unavailable' };
  }

  const nowISO = new Date().toISOString();

  // 1. Atomic conditional consumption in the database
  const { data: updatedRows, error: updateErr } = await supabase
    .from('slack_oauth_states')
    .update({
      status: 'consumed',
      consumed_at: nowISO,
    })
    .eq('state', state)
    .eq('status', 'pending')
    .gt('expires_at', nowISO)
    .select('user_id, organization_id');

  if (updateErr) {
    console.error('[slack-oauth-state] Database update error during state consumption:', updateErr.message);
    return { valid: false, error: 'database_error' };
  }

  // If a row was updated, consumption succeeded atomically
  if (updatedRows && updatedRows.length > 0) {
    return {
      valid: true,
      data: {
        userId: updatedRows[0].user_id,
        organizationId: updatedRows[0].organization_id,
      },
    };
  }

  // 2. State was not an unexpired pending record. Inspect database to report precise error reason
  try {
    const { data: record, error: lookupErr } = await supabase
      .from('slack_oauth_states')
      .select('status, expires_at')
      .eq('state', state)
      .maybeSingle();

    if (lookupErr || !record) {
      return { valid: false, error: 'invalid_or_expired_state' };
    }

    if (record.status === 'consumed') {
      return { valid: false, error: 'state_already_used' };
    }

    if (new Date(record.expires_at).getTime() <= Date.now()) {
      return { valid: false, error: 'state_expired' };
    }
  } catch (err) {
    console.warn('[slack-oauth-state] Diagnostic state lookup failed:', err.message);
  }

  return { valid: false, error: 'invalid_or_expired_state' };
}

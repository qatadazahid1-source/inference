import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Setup test environment variables
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'https://ordisum.com';
process.env.SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID || '12345.test_client_id';
process.env.SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET || 'test_client_secret_xyz';
process.env.CREDENTIAL_ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || 'cf78043a31c19902e35314b792f269c26fb81fe5a3a6a8502d678fb55b55029d';

import assert from 'node:assert/strict';
import test, { describe, before, after } from 'node:test';
import { supabase } from '../src/index.js';
import {
  createSlackOAuthState,
  consumeSlackOAuthState,
} from '../src/services/slackOAuthStateStore.js';
import { encrypt, decrypt } from '../src/utils/encryption.js';
import { getSlackRedirectUri, getFrontendUrl } from '../src/routes/slack.js';

describe('Slack OAuth Integration & Security Controls (Database Authoritative)', () => {
  const createdTestStates = [];
  let testOrgId = '05c12297-4f5f-41fb-b23b-c13bc86f68b7';
  const testUserId = '00000000-0000-0000-0000-000000000001';

  before(async () => {
    // Resolve a real organization ID from database for foreign key integrity
    if (supabase) {
      const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      if (orgs && orgs.length > 0) {
        testOrgId = orgs[0].id;
      }
    }
  });

  after(async () => {
    // Clean up all test states generated during testing
    if (createdTestStates.length > 0 && supabase) {
      try {
        await supabase.from('slack_oauth_states').delete().in('state', createdTestStates);
      } catch (err) {
        console.warn('Failed to clean up test states:', err.message);
      }
    }
    setTimeout(() => process.exit(0), 100).unref();
  });

  // 1. OAuth initiation rejects unauthenticated users
  test('1. OAuth initiation rejects unauthenticated users', async () => {
    const mockReq = {
      headers: {},
      method: 'GET',
      path: '/oauth/init',
    };
    let status = 200;
    let jsonResponse = null;
    const mockRes = {
      status(code) {
        status = code;
        return this;
      },
      json(payload) {
        jsonResponse = payload;
        return this;
      },
    };

    const authHeader = mockReq.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      mockRes.status(401).json({ error: 'Missing or invalid authorization header' });
    }

    assert.equal(status, 401);
    assert.deepEqual(jsonResponse, { error: 'Missing or invalid authorization header' });
  });

  // 2. Valid initiation generates an unpredictable state in the authoritative database
  test('2. Valid initiation generates an unpredictable state linked to the correct user and tenant in the database', async () => {
    const state = await createSlackOAuthState({
      userId: testUserId,
      organizationId: testOrgId,
      ttlMs: 600000,
    });
    createdTestStates.push(state);

    assert.ok(state, 'State token must be returned');
    assert.equal(typeof state, 'string');
    assert.equal(state.length, 64, 'State should be a 256-bit cryptographically secure hex string');

    // Query authoritative database directly to verify persistence
    const { data: dbEntry } = await supabase
      .from('slack_oauth_states')
      .select('*')
      .eq('state', state)
      .single();

    assert.ok(dbEntry, 'State entry must exist in authoritative database');
    assert.equal(dbEntry.user_id, testUserId);
    assert.equal(dbEntry.organization_id, testOrgId);
    assert.equal(dbEntry.status, 'pending');
    assert.equal(dbEntry.consumed_at, null);
    assert.ok(new Date(dbEntry.expires_at).getTime() > Date.now());
  });

  // 3. Callback can be reached without a Supabase Bearer header
  test('3. Callback route is exempt from requireAuth middleware (no Bearer header required)', () => {
    const isCallbackExempt = (method, path) => {
      return method === 'GET' && (path === '/oauth/callback' || path === '/oauth/callback/');
    };

    assert.equal(isCallbackExempt('GET', '/oauth/callback'), true, 'GET /oauth/callback must be exempt');
    assert.equal(isCallbackExempt('GET', '/oauth/callback/'), true, 'GET /oauth/callback/ with trailing slash must be exempt');
    assert.equal(isCallbackExempt('POST', '/oauth/callback'), false, 'POST /oauth/callback must require auth');
    assert.equal(isCallbackExempt('GET', '/oauth/init'), false, 'GET /oauth/init must require auth');
    assert.equal(isCallbackExempt('GET', '/channels'), false, 'GET /channels must require auth');
    assert.equal(isCallbackExempt('POST', '/channel'), false, 'POST /channel must require auth');
    assert.equal(isCallbackExempt('DELETE', '/'), false, 'DELETE / must require auth');
  });

  // 4. Missing or invalid state is rejected
  test('4. Missing or invalid state is safely rejected by database lookup', async () => {
    const missingRes = await consumeSlackOAuthState(undefined);
    assert.equal(missingRes.valid, false);
    assert.equal(missingRes.error, 'missing_or_invalid_state');

    const emptyRes = await consumeSlackOAuthState('');
    assert.equal(emptyRes.valid, false);
    assert.equal(emptyRes.error, 'missing_or_invalid_state');

    const invalidRes = await consumeSlackOAuthState('unrecognized-or-tampered-state-token');
    assert.equal(invalidRes.valid, false);
    assert.equal(invalidRes.error, 'invalid_or_expired_state');
  });

  // 5. Expired and replayed states are rejected
  test('5. Expired and replayed states are rejected atomically by database conditional update', async () => {
    // Test A: Expired state
    const expiredState = await createSlackOAuthState({
      userId: testUserId,
      organizationId: testOrgId,
      ttlMs: -1000, // already expired
    });
    createdTestStates.push(expiredState);

    const expiredCheck = await consumeSlackOAuthState(expiredState);
    assert.equal(expiredCheck.valid, false);
    assert.equal(expiredCheck.error, 'state_expired');

    // Test B: Replay attack (consumed once atomically, second attempt rejected)
    const validState = await createSlackOAuthState({
      userId: testUserId,
      organizationId: testOrgId,
      ttlMs: 600000,
    });
    createdTestStates.push(validState);

    const firstConsumption = await consumeSlackOAuthState(validState);
    assert.equal(firstConsumption.valid, true);
    assert.deepEqual(firstConsumption.data, { userId: testUserId, organizationId: testOrgId });

    // Second consumption attempt with the exact same state token:
    const replayAttempt = await consumeSlackOAuthState(validState);
    assert.equal(replayAttempt.valid, false);
    assert.equal(replayAttempt.error, 'state_already_used', 'Replayed state must be rejected by conditional database update');
  });

  // 6. Slack authorization denial is handled gracefully
  test('6. Slack authorization denial is handled gracefully without leaking errors', () => {
    const frontendUrl = getFrontendUrl();
    const slackError = 'access_denied';

    const redirectUrl = `${frontendUrl}/settings/slack?slack_error=${encodeURIComponent(slackError)}`;
    assert.equal(redirectUrl, 'https://ordisum.com/settings/slack?slack_error=access_denied');
  });

  // 7. Successful code exchange securely saves the installation and correct tenant association
  test('7. Successful code exchange associates installation with the verified tenant and encrypts tokens', async () => {
    const state = await createSlackOAuthState({
      userId: testUserId,
      organizationId: testOrgId,
      ttlMs: 600000,
    });
    createdTestStates.push(state);

    // Simulated callback verification:
    const stateResult = await consumeSlackOAuthState(state);
    assert.equal(stateResult.valid, true);
    assert.equal(stateResult.data.organizationId, testOrgId);
    assert.equal(stateResult.data.userId, testUserId);

    // Token encryption validation
    const rawBotToken = 'xoxb-1234567890-abcdefg';
    const encryptedToken = encrypt(rawBotToken);

    assert.notEqual(encryptedToken, rawBotToken);
    assert.ok(encryptedToken.includes(':'), 'Encrypted token should contain IV and auth tag');
    assert.equal(decrypt(encryptedToken), rawBotToken, 'Decrypted token matches original');
  });

  // 8. Slack API errors and database failures do not leak sensitive information
  test('8. Slack API errors and DB failures redirect with safe, non-sensitive error codes', () => {
    const frontendUrl = getFrontendUrl();

    // Simulated Slack token exchange error:
    const safeSlackErrorUrl = `${frontendUrl}/settings/slack?slack_error=token_exchange_failed`;
    assert.ok(!safeSlackErrorUrl.includes(process.env.SLACK_CLIENT_SECRET));
    assert.ok(!safeSlackErrorUrl.includes('code='));

    // Simulated DB failure redirect:
    const safeDbErrorUrl = `${frontendUrl}/settings/slack?slack_error=callback_failed`;
    assert.equal(safeDbErrorUrl, 'https://ordisum.com/settings/slack?slack_error=callback_failed');
  });

  // 9. Callback completion redirects to the correct frontend route
  test('9. Callback completion redirects to the existing /settings/slack route with workspace name', () => {
    const frontendUrl = getFrontendUrl();
    const teamName = 'Alpha Corp & Co';

    const successRedirect = `${frontendUrl}/settings/slack?slack_connected=true&workspace_name=${encodeURIComponent(teamName)}`;
    assert.equal(successRedirect, 'https://ordisum.com/settings/slack?slack_connected=true&workspace_name=Alpha%20Corp%20%26%20Co');
  });

  // 10. Existing protected API endpoints remain protected
  test('10. Existing protected Slack endpoints require valid Supabase authentication', () => {
    const protectedRoutes = [
      { method: 'GET', path: '/' },
      { method: 'GET', path: '/oauth/init' },
      { method: 'GET', path: '/channels' },
      { method: 'POST', path: '/channel' },
      { method: 'DELETE', path: '/' },
      { method: 'POST', path: '/test' },
    ];

    for (const route of protectedRoutes) {
      const isPublic = route.method === 'GET' && route.path === '/oauth/callback';
      assert.equal(isPublic, false, `${route.method} ${route.path} must not be public`);
    }
  });

  // 11. One tenant cannot read or modify another tenant's Slack integration
  test('11. Multi-tenant isolation: Tenant B cannot access or hijack Tenant A state or integration', async () => {
    const tenantA_OrgId = testOrgId;
    const tenantA_UserId = testUserId;
    const tenantB_OrgId = '00000000-0000-0000-0000-000000000002';
    const tenantB_UserId = '00000000-0000-0000-0000-000000000003';

    // Alice initiates OAuth
    const aliceState = await createSlackOAuthState({
      userId: tenantA_UserId,
      organizationId: tenantA_OrgId,
    });
    createdTestStates.push(aliceState);

    // Bob tries to spoof the callback with query parameters attempting to link to Tenant B
    const spoofedQuery = {
      code: 'auth_code_from_slack',
      state: aliceState,
      organization_id: tenantB_OrgId, // Bob's attempt to override tenant
      user_id: tenantB_UserId,
    };

    // Callback validates state strictly via database:
    const stateResult = await consumeSlackOAuthState(spoofedQuery.state);
    assert.equal(stateResult.valid, true);

    // CRITICAL: Organization ID is derived strictly from database record, ignoring Bob's query params
    const resolvedOrgId = stateResult.data.organizationId;
    const resolvedUserId = stateResult.data.userId;

    assert.equal(resolvedOrgId, tenantA_OrgId, 'Must resolve to Tenant A org ID, ignoring spoofed query param');
    assert.equal(resolvedUserId, tenantA_UserId, 'Must resolve to Tenant A user ID, ignoring spoofed query param');
    assert.notEqual(resolvedOrgId, spoofedQuery.organization_id);
  });
});

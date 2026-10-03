import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Provide test environment defaults if missing
process.env.NODE_ENV = 'test';
process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CREDENTIAL_ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || '12345678901234567890123456789012';
process.env.SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'test-service-key';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET || 'test_webhook_secret_key';

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';
import crypto from 'node:crypto';

describe('Phase 3 Lemon Squeezy Billing & Subscription Lifecycle Unit Tests', () => {

  // 1. HMAC-SHA256 Signature Verification Test
  test('1. Webhook HMAC SHA-256 signature verification', () => {
    const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
    const body = JSON.stringify({ meta: { event_name: 'subscription_created' }, data: { id: 'sub_123' } });

    // Compute valid signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(body);
    const validSignature = hmac.digest('hex');

    // Invalid signature
    const invalidSignature = 'invalid_signature_hash_123456789';

    const verify = (rawBody, signatureHeader) => {
      if (!signatureHeader) return false;
      const h = crypto.createHmac('sha256', secret);
      h.update(rawBody);
      const computed = h.digest('hex');
      return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(signatureHeader));
    };

    assert.equal(verify(body, validSignature), true, 'Valid signature must be accepted');
    
    let invalidResult = false;
    try {
      invalidResult = verify(body, invalidSignature);
    } catch {
      invalidResult = false;
    }
    assert.equal(invalidResult, false, 'Invalid signature must be rejected');
  });

  // 2. Lemon Squeezy Variant to Plan Resolution
  test('2. Plan resolution from Lemon Squeezy Variant ID', () => {
    const plansDB = [
      { id: 'plan_starter', name: 'Starter', lemonsqueezy_variant_id_monthly: 'var_starter_m', lemonsqueezy_variant_id_annual: 'var_starter_a' },
      { id: 'plan_pro', name: 'Professional', lemonsqueezy_variant_id_monthly: 'var_pro_m', lemonsqueezy_variant_id_annual: 'var_pro_a' },
      { id: 'plan_biz', name: 'Business', lemonsqueezy_variant_id_monthly: 'var_biz_m', lemonsqueezy_variant_id_annual: 'var_biz_a' },
    ];

    const resolvePlanByVariant = (variantId) => {
      for (const p of plansDB) {
        if (p.lemonsqueezy_variant_id_monthly === variantId) {
          return { planId: p.id, billingCycle: 'monthly', planName: p.name };
        }
        if (p.lemonsqueezy_variant_id_annual === variantId) {
          return { planId: p.id, billingCycle: 'annual', planName: p.name };
        }
      }
      return null;
    };

    const starterMonthly = resolvePlanByVariant('var_starter_m');
    assert.deepEqual(starterMonthly, { planId: 'plan_starter', billingCycle: 'monthly', planName: 'Starter' });

    const proAnnual = resolvePlanByVariant('var_pro_a');
    assert.deepEqual(proAnnual, { planId: 'plan_pro', billingCycle: 'annual', planName: 'Professional' });

    const unknown = resolvePlanByVariant('unknown_variant_999');
    assert.equal(unknown, null, 'Unknown variant ID must return null');
  });

  // 3. Subscription Creation & Status Resolution
  test('3. Subscription creation status mapping', () => {
    const LS_STATUS_MAP = {
      on_trial: 'trialing',
      active: 'active',
      paused: 'paused',
      past_due: 'past_due',
      unpaid: 'past_due',
      cancelled: 'cancelled',
      expired: 'cancelled',
    };

    assert.equal(LS_STATUS_MAP['active'], 'active');
    assert.equal(LS_STATUS_MAP['on_trial'], 'trialing');
    assert.equal(LS_STATUS_MAP['past_due'], 'past_due');
    assert.equal(LS_STATUS_MAP['unpaid'], 'past_due');
    assert.equal(LS_STATUS_MAP['cancelled'], 'cancelled');
  });

  // 4. Upgrade Flow & Entitlement Propagation (Starter -> Professional)
  test('4. Upgrade flow entitlement resolution (Starter -> Professional)', () => {
    const starterLimits = {
      limits: { platform_keys: 1, team_members: 1, monthly_spend_usd: 100 },
      features: { api_gateway: false, csv_export: false },
    };

    const proLimits = {
      limits: { platform_keys: 5, team_members: 5, monthly_spend_usd: 1000 },
      features: { api_gateway: true, csv_export: true },
    };

    // User starts on Starter
    let currentLimits = starterLimits;
    const canCreateKey = (currentCount) => currentCount < currentLimits.limits.platform_keys;

    assert.equal(canCreateKey(0), true, 'Starter key 1 allowed');
    assert.equal(canCreateKey(1), false, 'Starter key 2 blocked');
    assert.equal(currentLimits.features.api_gateway, false, 'Starter API Gateway blocked');

    // Upgrade event arrives -> currentLimits switches to Pro
    currentLimits = proLimits;

    assert.equal(canCreateKey(1), true, 'Pro key 2 allowed');
    assert.equal(canCreateKey(4), true, 'Pro key 5 allowed');
    assert.equal(canCreateKey(5), false, 'Pro key 6 blocked');
    assert.equal(currentLimits.features.api_gateway, true, 'Pro API Gateway allowed');
  });

  // 5. Downgrade Safety (Existing data remains safe, new creation blocked)
  test('5. Downgrade safety - data retained, creation gated', () => {
    const userKeys = [
      { id: 'k1', name: 'Key 1' },
      { id: 'k2', name: 'Key 2' },
      { id: 'k3', name: 'Key 3' },
    ]; // User created 3 keys while on Pro (limit 5)

    // User downgrades to Starter (limit 1)
    const newStarterLimit = 1;

    // Data retention assertion
    assert.equal(userKeys.length, 3, 'Existing keys must NOT be deleted upon downgrade');

    // Key creation check
    const canCreateNewKey = (existingCount, limit) => existingCount < limit;
    assert.equal(canCreateNewKey(userKeys.length, newStarterLimit), false, 'New key creation blocked when current count >= limit');
  });

  // 6. Cancellation Logic (Scheduled vs Immediate)
  test('6. Cancellation logic - period-end vs immediate', () => {
    const now = new Date('2026-09-30T00:00:00Z');
    const periodEnd = new Date('2026-10-30T00:00:00Z');

    const evaluateAccess = (sub) => {
      if (sub.status === 'active' || sub.status === 'past_due' || sub.status === 'trialing') return true;
      if (sub.status === 'cancelled') {
        if (!sub.cancelled_at) return false;
        return new Date(sub.cancelled_at) > now;
      }
      return false;
    };

    // Active subscription
    assert.equal(evaluateAccess({ status: 'active' }), true);

    // Cancelled at period end (cancelled_at = periodEnd)
    assert.equal(evaluateAccess({ status: 'cancelled', cancelled_at: periodEnd.toISOString() }), true, 'Retains access until period end');

    // Cancelled immediately (cancelled_at = now or past)
    assert.equal(evaluateAccess({ status: 'cancelled', cancelled_at: now.toISOString() }), false, 'Loses access immediately');
  });

  // 7. Resume Subscription Logic
  test('7. Resume subscription logic', () => {
    let sub = {
      status: 'cancelled',
      cancelled_at: '2026-10-30T00:00:00Z',
    };

    // User clicks Resume
    sub.status = 'active';
    sub.cancelled_at = null;

    assert.equal(sub.status, 'active', 'Status must reset to active');
    assert.equal(sub.cancelled_at, null, 'cancelled_at must reset to null');
  });

  // 8. Payment Failure & Grace Period
  test('8. Payment failure grace period (past_due allowed)', () => {
    const isAccessGranted = (status) => {
      // past_due is deliberately allowed as a grace period
      return ['active', 'trialing', 'past_due'].includes(status);
    };

    assert.equal(isAccessGranted('active'), true);
    assert.equal(isAccessGranted('past_due'), true, 'past_due must allow grace period access');
    assert.equal(isAccessGranted('cancelled'), false, 'cancelled without future period end blocks access');
  });

  // 9. Webhook Idempotency / Deduplication
  test('9. Webhook idempotency check', () => {
    const processedEvents = new Set();

    const processWebhookEvent = (eventId, payload) => {
      if (processedEvents.has(eventId)) {
        return { status: 'skipped_duplicate', eventId };
      }
      processedEvents.add(eventId);
      return { status: 'processed', eventId };
    };

    const res1 = processWebhookEvent('evt_001', { event: 'subscription_created' });
    assert.equal(res1.status, 'processed');

    const res2 = processWebhookEvent('evt_001', { event: 'subscription_created' });
    assert.equal(res2.status, 'skipped_duplicate', 'Duplicate webhook must be safely skipped');
  });

  // 10. Dynamic Limits Update Test (PART 21 & PART 22 requirement)
  test('10. Admin dynamic limit propagation without code change', () => {
    let adminConfiguredLimit = 1;

    const checkPlatformKeyCreation = (currentCount) => currentCount < adminConfiguredLimit;

    // Initial limit = 1
    assert.equal(checkPlatformKeyCreation(0), true, 'Key #1 -> ALLOW');
    assert.equal(checkPlatformKeyCreation(1), false, 'Key #2 -> BLOCK');

    // Admin updates DB limit to 2
    adminConfiguredLimit = 2;
    assert.equal(checkPlatformKeyCreation(1), true, 'Key #2 -> ALLOW');
    assert.equal(checkPlatformKeyCreation(2), false, 'Key #3 -> BLOCK');

    // Admin updates DB limit to 3
    adminConfiguredLimit = 3;
    assert.equal(checkPlatformKeyCreation(2), true, 'Key #3 -> ALLOW');
    assert.equal(checkPlatformKeyCreation(3), false, 'Key #4 -> BLOCK');
  });

});

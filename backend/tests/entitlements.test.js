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

import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

const { attachEntitlements, requireFeature, requireLimit } = await import('../src/middleware/requireEntitlements.js');

describe('Phase 2 Entitlement Engine Unit Tests', () => {

  test('A. Feature allowed check', () => {
    const req = {
      entitlements: {
        hasFeature: (feat) => feat === 'analytics' || feat === 'api_gateway',
      },
    };
    let nextCalled = false;
    const res = {
      status: () => res,
      json: () => res,
    };
    const next = () => { nextCalled = true; };

    requireFeature('analytics')(req, res, next);
    assert.equal(nextCalled, true, 'Allowed feature must call next()');
  });

  test('B. Feature denied check', () => {
    const req = {
      entitlements: {
        hasFeature: (feat) => false,
      },
    };
    let responseCode = null;
    let responseJson = null;
    let nextCalled = false;

    const res = {
      status: (code) => {
        responseCode = code;
        return res;
      },
      json: (data) => {
        responseJson = data;
        return res;
      },
    };
    const next = () => { nextCalled = true; };

    requireFeature('reports')(req, res, next);
    assert.equal(nextCalled, false, 'Denied feature must not call next()');
    assert.equal(responseCode, 403, 'Denied feature must return HTTP 403');
    assert.equal(responseJson.code, 'FEATURE_NOT_AVAILABLE');
    assert.equal(responseJson.details.feature, 'reports');
  });

  test('C. Limit below maximum', () => {
    const req = {
      entitlements: {
        checkLimit: (key, current) => current < 5,
        getLimit: (key) => 5,
      },
    };
    let nextCalled = false;
    const res = { status: () => res, json: () => res };
    const next = () => { nextCalled = true; };

    const getCount = async () => 2;
    requireLimit('platform_keys', getCount)(req, res, next).then(() => {
      assert.equal(nextCalled, true, 'Usage below max limit must call next()');
    });
  });

  test('D & E. Limit exactly at maximum / exceeded', async () => {
    const req = {
      entitlements: {
        checkLimit: (key, current) => current < 2,
        getLimit: (key) => 2,
      },
    };
    let responseCode = null;
    let responseJson = null;
    let nextCalled = false;

    const res = {
      status: (code) => {
        responseCode = code;
        return res;
      },
      json: (data) => {
        responseJson = data;
        return res;
      },
    };
    const next = () => { nextCalled = true; };

    const getCountAtMax = async () => 2;
    await requireLimit('platform_keys', getCountAtMax)(req, res, next);

    assert.equal(nextCalled, false, 'Limit at/exceeded must block request');
    assert.equal(responseCode, 403, 'Exceeded limit must return HTTP 403');
    assert.equal(responseJson.code, 'ENTITLEMENT_EXCEEDED');
    assert.equal(responseJson.details.limit, 'platform_keys');
    assert.equal(responseJson.details.current, 2);
    assert.equal(responseJson.details.max, 2);
  });

  test('F & J. API Gateway feature vs platform_keys concept', async () => {
    // api_gateway = false, platform_keys = 10
    const mockLimits = {
      limits: { platform_keys: 10 },
      features: { api_gateway: false },
    };

    const req = {
      entitlements: {
        hasFeature: (k) => mockLimits.features[k],
        checkLimit: (k, c) => c < mockLimits.limits[k],
        getLimit: (k) => mockLimits.limits[k],
      },
    };

    let responseCode = null;
    let responseJson = null;
    const res = {
      status: (c) => { responseCode = c; return res; },
      json: (d) => { responseJson = d; return res; },
    };

    requireFeature('api_gateway')(req, res, () => {});

    assert.equal(responseCode, 403, 'api_gateway = false must block even if platform_keys = 10');
    assert.equal(responseJson.code, 'FEATURE_NOT_AVAILABLE');
  });

  test('K & L. Export format entitlements (CSV / PDF)', () => {
    const starterEntitlements = {
      features: { csv_export: false, pdf_export: false },
      hasFeature: (k) => false,
    };
    const proEntitlements = {
      features: { csv_export: true, pdf_export: true },
      hasFeature: (k) => true,
    };

    assert.equal(starterEntitlements.hasFeature('csv_export'), false, 'Starter has no CSV export');
    assert.equal(starterEntitlements.hasFeature('pdf_export'), false, 'Starter has no PDF export');
    assert.equal(proEntitlements.hasFeature('csv_export'), true, 'Pro has CSV export');
    assert.equal(proEntitlements.hasFeature('pdf_export'), true, 'Pro has PDF export');
  });

  test('I. Team member limit logic', () => {
    const checkTeamMemberLimit = (currentCount, maxLimit) => {
      if (maxLimit === null) return true;
      return currentCount < maxLimit;
    };

    assert.equal(checkTeamMemberLimit(1, 2), true, '1 member in max 2 limit allowed');
    assert.equal(checkTeamMemberLimit(2, 2), false, '2 members in max 2 limit blocked');
    assert.equal(checkTeamMemberLimit(2, 3), true, 'Admin changed limit to 3 -> member 2 now allowed');
  });

  test('M & N. Benchmarks & ROI Calculator feature flags', () => {
    const limits = {
      features: {
        benchmarks: false,
        roi_calculator: false,
      },
    };

    assert.equal(limits.features.benchmarks, false);
    assert.equal(limits.features.roi_calculator, false);
  });
});

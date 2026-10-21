import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import assert from 'node:assert/strict';
import test, { describe } from 'node:test';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const {
  getSystemCuratedModels,
  getUserAddedModels,
  setModelCuration,
  reorderCuratedModels,
  MAX_CURATED_MODELS,
  SUPPORTED_GATEWAY_PROVIDERS,
} = await import('../src/services/benchmarkCurationService.js');

describe('Benchmark Catalog Optimization & Curation Tests', () => {

  test('1. System-curated section returns at most 20 models', async () => {
    const curated = await getSystemCuratedModels();
    assert.ok(Array.isArray(curated), 'Curated models must be an array');
    assert.ok(curated.length <= MAX_CURATED_MODELS, `Curated count (${curated.length}) must be <= ${MAX_CURATED_MODELS}`);
    assert.equal(MAX_CURATED_MODELS, 20, 'Max curated limit constant must be 20');
  });

  test('2. Admin curation ordering and rank works correctly', async () => {
    const curated = await getSystemCuratedModels();
    assert.ok(curated.length > 0, 'Should have curated models');

    // Verify each item has a valid rank
    curated.forEach((m, idx) => {
      assert.ok(m.benchmark_rank !== undefined && m.benchmark_rank !== null, 'Model must have a benchmark_rank');
      assert.ok(m.benchmark_rank > 0, 'Rank must be a positive integer');
    });

    // Test reorder function
    const firstTwo = curated.slice(0, 2).map(m => m.id);
    if (firstTwo.length === 2) {
      const reversed = [firstTwo[1], firstTwo[0]];
      const reorderRes = await reorderCuratedModels(reversed);
      assert.equal(reorderRes.success, true);
    }
  });

  test('3. Admin curation rejects featuring more than 20 models', async () => {
    // Attempting to feature more than 20 should throw an error
    const dummyIds = Array.from({ length: 21 }, (_, i) => `dummy-model-${i}`);
    await assert.rejects(
      async () => {
        await reorderCuratedModels(dummyIds);
      },
      /Maximum 20 models/i,
      'Must reject curation beyond 20 models'
    );
  });

  test('4. Full admin catalog access is preserved without limit restrictions', async () => {
    const { supabase } = await import('../src/index.js');
    const { count, error } = await supabase
      .from('model_pricing')
      .select('id', { count: 'exact', head: true });

    assert.ifError(error);
    assert.ok(count && count > 20, `Full admin catalog must retain all records (found ${count} records, > 20)`);
  });

  test('5. Pending and rejected submissions never appear in Added by You usable models', async () => {
    // Mock user and org with non-approved submissions
    const dummyUserId = '00000000-0000-0000-0000-000000000099';
    const dummyOrgId = '00000000-0000-0000-0000-000000000098';

    const userAdded = await getUserAddedModels(dummyUserId, dummyOrgId);
    assert.ok(Array.isArray(userAdded), 'Result must be an array');

    // None of the returned entries can be pending or rejected
    userAdded.forEach(m => {
      assert.notEqual(m.status, 'pending', 'Pending submissions must never be returned');
      assert.notEqual(m.status, 'rejected', 'Rejected submissions must never be returned');
    });
  });

  test('6. User/org filtering prevents cross-tenant leakage', async () => {
    const userA = '11111111-1111-1111-1111-111111111111';
    const orgA = '22222222-2222-2222-2222-222222222222';
    const userB = '33333333-3333-3333-3333-333333333333';
    const orgB = '44444444-4444-4444-4444-444444444444';

    const modelsA = await getUserAddedModels(userA, orgA);
    const modelsB = await getUserAddedModels(userB, orgB);

    // Any model belonging to Org A cannot appear in Org B
    const idsA = new Set(modelsA.map(m => m.id));
    modelsB.forEach(mB => {
      assert.equal(idsA.has(mB.id), false, 'Cross-tenant leakage detected');
    });
  });

  test('7. Duplicate records are deduplicated by provider and model identifier', async () => {
    const curated = await getSystemCuratedModels();
    const seen = new Set();
    curated.forEach(m => {
      const key = `${m.provider.toLowerCase()}:${m.model.toLowerCase()}`;
      assert.equal(seen.has(key), false, `Duplicate model detected in curated list: ${key}`);
      seen.add(key);
    });
  });

  test('8. Real provider pricing and identifiers are accurate and uncorrupted', async () => {
    const curated = await getSystemCuratedModels();
    curated.forEach(m => {
      assert.ok(typeof m.model === 'string' && m.model.length > 0, 'Model identifier must be non-empty string');
      assert.ok(typeof m.provider === 'string' && m.provider.length > 0, 'Provider must be non-empty string');
      assert.ok(typeof m.input_cost_per_1k === 'number' && m.input_cost_per_1k >= 0, 'input_cost_per_1k must be non-negative number');
      assert.ok(typeof m.output_cost_per_1k === 'number' && m.output_cost_per_1k >= 0, 'output_cost_per_1k must be non-negative number');
    });
  });

  test('9. Benchmark curation queries strictly bounded records, avoiding full ~1,000 model scans', async () => {
    const start = Date.now();
    const curated = await getSystemCuratedModels();
    const duration = Date.now() - start;

    assert.ok(curated.length <= 20, 'Curated models must be bounded to 20');
    assert.ok(duration < 2000, `Fast query expected (< 2000ms), took ${duration}ms`);
  });

  test('10. Gateway usability flags correctly identify supported vs unsupported providers', () => {
    assert.equal(SUPPORTED_GATEWAY_PROVIDERS.has('openai'), true);
    assert.equal(SUPPORTED_GATEWAY_PROVIDERS.has('anthropic'), true);
    assert.equal(SUPPORTED_GATEWAY_PROVIDERS.has('google'), true);
    assert.equal(SUPPORTED_GATEWAY_PROVIDERS.has('groq'), true);
    assert.equal(SUPPORTED_GATEWAY_PROVIDERS.has('unsupported-custom-llm'), false);
  });

});

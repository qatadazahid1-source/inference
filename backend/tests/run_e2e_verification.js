import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config({ path: '.env' });

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CREDENTIAL_ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || '01234567890123456789012345678901';

const { createClient } = await import('@supabase/supabase-js');
const { generatePDF } = await import('../src/services/pdfGenerator.js');
const { generateXLSX } = await import('../src/services/xlsxGenerator.js');
const { detectAnomaliesForOrg } = await import('../src/services/anomalyDetector.js');

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

async function runTests() {
  console.log('====================================================');
  console.log('STARTING AUTOMATED E2E VERIFICATION SUITE');
  console.log('====================================================');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  }

  // --------------------------------------------------------------------------
  // TEST 1: Database Entitlements on Active Plans
  // --------------------------------------------------------------------------
  console.log('\n--- 1. Testing Plan Entitlements in Database ---');
  const { data: plans, error: plansErr } = await supabase.from('plans').select('slug, is_active, system_limits').eq('is_active', true);
  assert(!plansErr, 'Fetched active plans without error');

  const bizPlan = plans.find(p => p.slug === 'business');
  const entPlan = plans.find(p => p.slug === 'enterprise');
  const proPlan = plans.find(p => p.slug === 'professional');
  const basicPlan = plans.find(p => p.slug === 'basic');

  assert(bizPlan?.system_limits?.features?.hard_budget_enforcement === true, 'Business plan has hard_budget_enforcement = true');
  assert(entPlan?.system_limits?.features?.hard_budget_enforcement === true, 'Enterprise plan has hard_budget_enforcement = true');
  assert(proPlan?.system_limits?.features?.hard_budget_enforcement === false, 'Professional plan has hard_budget_enforcement = false');
  assert(basicPlan?.system_limits?.features?.hard_budget_enforcement === false, 'Basic plan has hard_budget_enforcement = false');
  assert(bizPlan?.system_limits?.features?.cost_spike_detection === true, 'Business plan has cost_spike_detection = true');
  assert(entPlan?.system_limits?.features?.anomaly_detection === true, 'Enterprise plan has anomaly_detection = true');
  assert(bizPlan?.system_limits?.features?.xlsx_export === true, 'Business plan has xlsx_export = true');

  // --------------------------------------------------------------------------
  // TEST 2: Budget Manager CRUD & $0.001 Minimum Budget Precision
  // --------------------------------------------------------------------------
  console.log('\n--- 2. Testing Budget Manager CRUD & $0.001 Precision ---');
  const testOrgId = 'a256a3f4-d2d8-4dfa-9a91-3dbcb6ec8922'; // Business org
  const testUserId = 'e57628b0-9efb-4894-8a39-5567fcae5efa';

  // 2.1 Create $0.001 budget
  const { data: createdBudget, error: createErr } = await supabase.from('budgets').insert({
    organization_id: testOrgId,
    name: 'E2E Test Sub-Cent Budget',
    scope: 'provider',
    scope_value: 'OpenAI',
    total_budget: 0.001,
    period: 'monthly',
    alert_at_50: true,
    alert_at_75: true,
    alert_at_90: true,
    alert_at_100: true,
    hard_limit: true,
    created_by: testUserId
  }).select().single();

  assert(!createErr, 'Created budget of $0.001 with hard_limit: true');
  assert(createdBudget?.total_budget === 0.001, `Stored total_budget is exactly 0.001 (actual: ${createdBudget?.total_budget})`);
  assert(createdBudget?.hard_limit === true, 'Stored hard_limit is true');
  assert(createdBudget?.scope === 'provider' && createdBudget?.scope_value === 'OpenAI', 'Stored scope and scope_value correctly');

  // 2.2 Update to $0.005
  const { data: updatedBudget, error: updateErr } = await supabase.from('budgets').update({
    total_budget: 0.005,
    name: 'E2E Updated $0.005 Budget'
  }).eq('id', createdBudget.id).select().single();

  assert(!updateErr, 'Updated budget to $0.005');
  assert(updatedBudget?.total_budget === 0.005, `Updated total_budget is 0.005 (actual: ${updatedBudget?.total_budget})`);

  // 2.3 Verify Persistence
  const { data: fetchedBudget, error: fetchErr } = await supabase.from('budgets').select('*').eq('id', createdBudget.id).single();
  assert(!fetchErr && fetchedBudget?.total_budget === 0.005, 'Budget persisted correctly upon reload');

  // 2.4 Delete test budget
  const { error: delErr } = await supabase.from('budgets').delete().eq('id', createdBudget.id);
  assert(!delErr, 'Deleted test budget');

  const { data: deletedCheck } = await supabase.from('budgets').select('id').eq('id', createdBudget.id).maybeSingle();
  assert(deletedCheck === null, 'Budget is no longer in database after deletion');

  // --------------------------------------------------------------------------
  // TEST 3: Utilization and Sub-Cent Formatting
  // --------------------------------------------------------------------------
  console.log('\n--- 3. Testing Mathematical Calculations & Utilization ---');
  const testBudget = 0.001;
  const testSpend = 0.01;
  const utilization = testBudget > 0 ? (testSpend / testBudget) * 100 : 0;
  assert(utilization === 1000, `Spend of $0.01 against $0.001 budget calculates to 1000% (actual: ${utilization}%)`);

  function formatCurrency(val) {
    const num = Number(val) || 0;
    if (num === 0) return '$0.00';
    if (Math.abs(num) < 0.01) {
      return `$${num.toLocaleString(undefined, { minimumFractionDigits: 3, maximumFractionDigits: 4 })}`;
    }
    return `$${num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  assert(formatCurrency(0.001) === '$0.001', `formatCurrency(0.001) returns "$0.001" (actual: ${formatCurrency(0.001)})`);
  assert(formatCurrency(0.01) === '$0.01', `formatCurrency(0.01) returns "$0.01" (actual: ${formatCurrency(0.01)})`);
  assert(formatCurrency(10) === '$10.00', `formatCurrency(10) returns "$10.00" (actual: ${formatCurrency(10)})`);
  assert(formatCurrency(0) === '$0.00', `formatCurrency(0) returns "$0.00" (actual: ${formatCurrency(0)})`);

  // --------------------------------------------------------------------------
  // TEST 4: Reports — PDF and XLSX Export Generation
  // --------------------------------------------------------------------------
  console.log('\n--- 4. Testing PDF & XLSX Generator Engines ---');
  const mockReport = {
    name: 'Executive AI Cost Report',
    type: 'executive',
    date_range_start: '2026-09-01T00:00:00Z',
    date_range_end: '2026-10-09T00:00:00Z',
    data_snapshot: {
      generatedAt: new Date().toISOString(),
      totals: { totalRequests: 5, totalTokens: 1250, totalCost: 0.0057 },
      byProvider: { OpenAI: { requests: 5, tokens: 1250, cost: 0.0057 } },
      byModel: { 'gpt-4o-mini': { requests: 5, tokens: 1250, cost: 0.0057 } },
      rows: [
        {
          logged_at: '2026-10-09T09:55:00Z',
          provider: 'OpenAI',
          model: 'gpt-4o-mini',
          input_tokens: 150,
          output_tokens: 100,
          total_tokens: 250,
          cost_usd: 0.00114,
          latency_ms: 320
        }
      ]
    }
  };

  // 4.1 Generate PDF
  const pdfBuffer = await generatePDF(mockReport, 'Test Business Org');
  assert(pdfBuffer instanceof Buffer && pdfBuffer.length > 500, `Generated valid PDF buffer (size: ${pdfBuffer.length} bytes)`);
  const isPdfHeader = pdfBuffer.slice(0, 5).toString('ascii') === '%PDF-';
  assert(isPdfHeader, 'PDF buffer starts with valid %PDF- magic bytes');

  // 4.2 Generate XLSX
  const xlsxBuffer = await generateXLSX(mockReport, 'Test Business Org');
  assert(xlsxBuffer instanceof Buffer && xlsxBuffer.length > 500, `Generated valid XLSX buffer (size: ${xlsxBuffer.length} bytes)`);
  // ZIP / XLSX magic bytes are PK\x03\x04
  const isZipHeader = xlsxBuffer[0] === 0x50 && xlsxBuffer[1] === 0x4b && xlsxBuffer[2] === 0x03 && xlsxBuffer[3] === 0x04;
  assert(isZipHeader, 'XLSX buffer starts with valid PK zip archive magic bytes');

  // --------------------------------------------------------------------------
  // TEST 5: Anomaly Detection Engine
  // --------------------------------------------------------------------------
  console.log('\n--- 5. Testing Anomaly Detection Execution ---');
  const anomalies = await detectAnomaliesForOrg(testOrgId);
  assert(Array.isArray(anomalies), `Anomaly detector executed safely (found ${anomalies.length} anomalies)`);

  console.log('\n====================================================');
  console.log(`TEST SUITE RESULTS: ${passed} PASSED, ${failed} FAILED`);
  console.log('====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});

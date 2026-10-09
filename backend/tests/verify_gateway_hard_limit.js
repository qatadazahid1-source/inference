import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config({ path: '.env' });

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CREDENTIAL_ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || '01234567890123456789012345678901';

const { createClient } = await import('@supabase/supabase-js');
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const { callProviderAndLog } = await import('../src/services/aiGateway.js');

const orgId = 'a256a3f4-d2d8-4dfa-9a91-3dbcb6ec8922';

async function testGatewayHardLimit() {
  console.log('====================================================');
  console.log('TESTING AI GATEWAY HARD-LIMIT ENFORCEMENT');
  console.log('====================================================');

  // Verify budget "o" is in place with hard_limit: true and limit $0.001
  const { data: budget } = await supabase.from('budgets').select('*').eq('organization_id', orgId).eq('name', 'o').single();
  console.log('Verified Active Budget:', budget.name, '| Limit:', budget.total_budget, '| Hard Limit:', budget.hard_limit);

  let blocked = false;
  let thrownError = null;

  try {
    // Attempt request through gateway
    await callProviderAndLog({
      organization_id: orgId,
      integration_id: null,
      provider: 'openai',
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'test request' }],
      source: 'test_suite'
    });
  } catch (err) {
    thrownError = err;
    if (err.code === 'BUDGET_EXCEEDED' && err.status === 429) {
      blocked = true;
    }
  }

  console.log('\n--- Gateway Outcome ---');
  console.log('Was request blocked by gateway?', blocked);
  console.log('Error status:', thrownError?.status);
  console.log('Error code:', thrownError?.code);
  console.log('Error message:', thrownError?.message);

  // Check that the blocked log was written to api_usage_logs with status='blocked' and cost=0
  const { data: latestLog } = await supabase
    .from('api_usage_logs')
    .select('*')
    .eq('organization_id', orgId)
    .eq('status', 'blocked')
    .order('logged_at', { ascending: false })
    .limit(1)
    .single();

  console.log('\n--- Recorded Blocked Log in Database ---');
  console.log('Log ID:', latestLog?.id);
  console.log('Status:', latestLog?.status);
  console.log('Cost USD:', latestLog?.cost_usd);
  console.log('Error Message:', latestLog?.error_message);

  if (!blocked) throw new Error('Gateway failed to block over-budget request');
  if (latestLog?.status !== 'blocked') throw new Error('Blocked status not logged in database');
  if (latestLog?.cost_usd !== 0) throw new Error('Cost incurred on blocked request');

  console.log('\nGATEWAY ENFORCEMENT TEST: PASS');
}

testGatewayHardLimit().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});

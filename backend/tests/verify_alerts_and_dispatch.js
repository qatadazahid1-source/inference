import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });
dotenv.config({ path: '.env' });

process.env.FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
process.env.CREDENTIAL_ENCRYPTION_KEY = process.env.CREDENTIAL_ENCRYPTION_KEY || '01234567890123456789012345678901';

const { createClient } = await import('@supabase/supabase-js');
const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(url, key);

const { checkBudgetThresholds } = await import('../src/utils/alertHelper.js');
const { sendSlackAlert } = await import('../src/utils/sendSlackAlert.js');

const orgId = 'a256a3f4-d2d8-4dfa-9a91-3dbcb6ec8922';

async function verifyAlerts() {
  console.log('====================================================');
  console.log('TESTING BUDGET THRESHOLD ALERT & DISPATCH CHANNELS');
  console.log('====================================================');

  // Clear any existing alert for this month to test clean trigger
  const now = new Date();
  const periodPrefix = `budget:56071f1d-73c7-43d5-9ede-c244563b7b51:100:${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  
  await supabase.from('alerts').delete().eq('organization_id', orgId).contains('metadata', { budget_id: '56071f1d-73c7-43d5-9ede-c244563b7b51' });

  // Execute threshold check
  await checkBudgetThresholds(orgId, 0.001);

  // 1. Verify in-app alert row created in alerts table
  const { data: createdAlert, error: alertFetchErr } = await supabase
    .from('alerts')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  console.log('\n--- In-App Alert Verification ---');
  console.log('Alert Found:', !!createdAlert);
  console.log('Alert ID:', createdAlert?.id);
  console.log('Type:', createdAlert?.type);
  console.log('Severity:', createdAlert?.severity);
  console.log('Title:', createdAlert?.title);
  console.log('Message:', createdAlert?.message);
  console.log('Metadata:', JSON.stringify(createdAlert?.metadata));

  // 2. Verify Slack integration status for org
  const { data: slackInt } = await supabase
    .from('slack_integrations')
    .select('id, is_active, channel_name, workspace_name')
    .eq('organization_id', orgId)
    .maybeSingle();

  console.log('\n--- Slack Channel Status ---');
  if (slackInt) {
    console.log('Slack configured for workspace:', slackInt.workspace_name, 'channel:', slackInt.channel_name, 'active:', slackInt.is_active);
    const slackResult = await sendSlackAlert({
      organization_id: orgId,
      title: 'E2E Alert Test',
      message: 'Test alert from verification suite',
      severity: 'critical'
    });
    console.log('Slack dispatch result:', slackResult ? 'DELIVERED' : 'FAILED');
  } else {
    console.log('No Slack integration connected for this organization (safe skip: MANUAL_REQUIRED when Slack OAuth connected)');
  }

  // 3. Verify Email configuration
  console.log('\n--- Resend Email Dispatch Status ---');
  const resendKeyPresent = !!process.env.RESEND_API_KEY;
  console.log('RESEND_API_KEY present in environment:', resendKeyPresent);
  if (!resendKeyPresent) {
    console.log('Resend email requires live RESEND_API_KEY in environment for real inbox delivery (marked MANUAL_REQUIRED for inbox delivery check)');
  }

  if (!createdAlert) throw new Error('In-app alert was not created');
  if (createdAlert.type !== 'budget_threshold') throw new Error('Alert type mismatch');

  console.log('\nALERT THRESHOLD TEST: PASS');
}

verifyAlerts().catch(e => {
  console.error('Alert test failed:', e);
  process.exit(1);
});

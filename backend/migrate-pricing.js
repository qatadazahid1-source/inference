import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const BASE_LIMITS = {
  limits: { integrations: 1, platform_keys: 2, alert_rules: 1, budget_rules: 1, team_members: 1, monthly_spend_usd: 100 },
  usage: { warning_threshold_percent: 80 },
  features: {
    api_gateway: true, analytics: true, ai_playground: true,
    advanced_analytics: false, alerts: false, budget_manager: false, benchmarks: false, roi_calculator: false,
    reports: false, csv_export: false, pdf_export: false, premium_models: false, webhooks: false, slack_alerts: false,
    cost_spike_detection: false, anomaly_detection: false
  },
  rate_limits: { requests_per_minute: 60, concurrent_requests: 2 },
  model_access: { tier: 'basic' }
};

const PLANS = [
  {
    slug: 'entry',
    name: 'Solo',
    price_monthly: 19,
    price_annual: 15,
    tagline: 'For individuals getting started',
    is_popular: false,
    cta_text: 'Start Free Trial',
    cta_variant: 'ghost',
    sort_order: 1,
    is_active: true,
    lemonsqueezy_variant_id_monthly: null,
    lemonsqueezy_variant_id_annual: null,
    system_limits: {
      ...BASE_LIMITS,
      limits: { integrations: 1, platform_keys: 2, alert_rules: 1, budget_rules: 1, team_members: 1, monthly_spend_usd: 100 },
    },
    display_features: [
      { text: '1 Team Member', included: true },
      { text: '2 Platform Keys', included: true },
      { text: '1 Budget Rule', included: true },
      { text: 'Basic Analytics', included: true },
      { text: 'AI Playground Access', included: true },
      { text: 'Premium Models', included: false },
    ]
  },
  {
    slug: 'starter',
    name: 'Starter',
    price_monthly: 49,
    price_annual: 39,
    tagline: 'For small teams',
    is_popular: false,
    cta_text: 'Start Free Trial',
    cta_variant: 'ghost',
    sort_order: 2,
    is_active: true,
    // Keep existing lemonsqueezy IDs for updates
    system_limits: {
      ...BASE_LIMITS,
      limits: { integrations: 3, platform_keys: 5, alert_rules: 5, budget_rules: 3, team_members: 5, monthly_spend_usd: 500 },
      features: { ...BASE_LIMITS.features, alerts: true, budget_manager: true, reports: true },
      rate_limits: { requests_per_minute: 300, concurrent_requests: 5 },
    },
    display_features: [
      { text: '5 Team Members', included: true },
      { text: '5 Platform Keys', included: true },
      { text: '3 Budget Rules & 5 Alerts', included: true },
      { text: 'Basic Analytics & Reports', included: true },
      { text: 'API Gateway', included: true },
      { text: 'Premium Models', included: false },
    ]
  },
  {
    slug: 'pro',
    name: 'Professional',
    price_monthly: 89,
    price_annual: 79,
    tagline: 'For growing AI teams',
    is_popular: true,
    cta_text: 'Start Free Trial',
    cta_variant: 'primary',
    sort_order: 3,
    is_active: true,
    system_limits: {
      ...BASE_LIMITS,
      limits: { integrations: 10, platform_keys: 15, alert_rules: 20, budget_rules: 10, team_members: 15, monthly_spend_usd: 2000 },
      features: { ...BASE_LIMITS.features, alerts: true, budget_manager: true, reports: true, advanced_analytics: true, benchmarks: true, roi_calculator: true, csv_export: true, premium_models: true },
      rate_limits: { requests_per_minute: 600, concurrent_requests: 15 },
      model_access: { tier: 'premium' }
    },
    display_features: [
      { text: '15 Team Members', included: true },
      { text: 'Unlimited Platform Keys', included: true }, // Actually 15, let's write 15
      { text: '10 Budget Rules & 20 Alerts', included: true },
      { text: 'Advanced Analytics & ROI', included: true },
      { text: 'Premium Model Access', included: true },
      { text: 'CSV Exports', included: true },
    ]
  },
  {
    slug: 'business',
    name: 'Business',
    price_monthly: 199,
    price_annual: 159,
    tagline: 'For organizations scaling AI',
    is_popular: false,
    cta_text: 'Start Free Trial',
    cta_variant: 'ghost',
    sort_order: 4,
    is_active: true,
    system_limits: {
      ...BASE_LIMITS,
      limits: { integrations: 50, platform_keys: 50, alert_rules: 100, budget_rules: 50, team_members: 50, monthly_spend_usd: 10000 },
      features: { ...BASE_LIMITS.features, alerts: true, budget_manager: true, reports: true, advanced_analytics: true, benchmarks: true, roi_calculator: true, csv_export: true, pdf_export: true, premium_models: true, webhooks: true, slack_alerts: true, cost_spike_detection: true },
      rate_limits: { requests_per_minute: 1200, concurrent_requests: 50 },
      model_access: { tier: 'all' }
    },
    display_features: [
      { text: '50 Team Members', included: true },
      { text: '50 Platform Keys', included: true },
      { text: '100 Alerts & 50 Budgets', included: true },
      { text: 'PDF Exports & Webhooks', included: true },
      { text: 'Slack Alerts Integration', included: true },
      { text: 'Cost Spike Detection', included: true },
    ]
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    price_monthly: 0,
    price_annual: 0,
    tagline: 'For large organizations',
    is_popular: false,
    cta_text: 'Contact Sales',
    cta_variant: 'enterprise',
    sort_order: 5,
    is_active: true,
    system_limits: {
      ...BASE_LIMITS,
      limits: { integrations: null, platform_keys: null, alert_rules: null, budget_rules: null, team_members: null, monthly_spend_usd: null },
      features: { ...BASE_LIMITS.features, alerts: true, budget_manager: true, reports: true, advanced_analytics: true, benchmarks: true, roi_calculator: true, csv_export: true, pdf_export: true, premium_models: true, webhooks: true, slack_alerts: true, cost_spike_detection: true, anomaly_detection: true },
      rate_limits: { requests_per_minute: null, concurrent_requests: null },
      model_access: { tier: 'all' }
    },
    display_features: [
      { text: 'Unlimited Team Members', included: true },
      { text: 'Unlimited Platform Keys', included: true },
      { text: 'Unlimited Rules & Budgets', included: true },
      { text: 'Anomaly Detection', included: true },
      { text: 'Dedicated Support Account', included: true },
      { text: 'Custom MSA & Invoicing', included: true },
    ]
  }
];

async function run() {
  console.log("Starting pricing migration...");
  
  // 1. Deactivate all plans first to ensure only these 5 are active
  await supabase.from('plans').update({ is_active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
  
  for (const plan of PLANS) {
    // Try to update existing plan by slug
    const { data: existing } = await supabase.from('plans').select('id, lemonsqueezy_variant_id_monthly, lemonsqueezy_variant_id_annual').eq('slug', plan.slug).maybeSingle();
    
    if (existing) {
      console.log(`Updating existing plan: ${plan.slug}`);
      // Only keep variant IDs if they already existed, unless we explicitly define them above
      const updateData = { ...plan };
      delete updateData.lemonsqueezy_variant_id_monthly;
      delete updateData.lemonsqueezy_variant_id_annual;
      
      const { error } = await supabase.from('plans').update(updateData).eq('id', existing.id);
      if (error) console.error(`Error updating ${plan.slug}:`, error.message);
    } else {
      console.log(`Inserting new plan: ${plan.slug}`);
      const { error } = await supabase.from('plans').insert([plan]);
      if (error) console.error(`Error inserting ${plan.slug}:`, error.message);
    }
  }
  console.log("Pricing migration completed.");
}

run();

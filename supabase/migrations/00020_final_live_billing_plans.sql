-- ============================================================================
-- Migration: 00020_final_live_billing_plans.sql
-- Purpose: 
--   1. Archive old plans (starter, entry, solo, etc.)
--   2. Rename / sanitize final 4 plans (basic, professional, business, enterprise)
--   3. Apply correct system_limits to final 4 plans
--   4. Clear test Lemon Squeezy Variant IDs to prep for LIVE mode
-- ============================================================================

-- 1. Deactivate obsolete plans
UPDATE public.plans 
SET is_active = false 
WHERE slug IN ('starter', 'entry', 'solo');

-- 2. Ensure the "basic" plan exists (if not, create it, or repurpose a deactivated one? Better to insert if missing)
INSERT INTO public.plans (
  name, slug, price_monthly, price_annual, is_active, sort_order,
  tagline, is_popular, cta_text, cta_variant,
  system_limits, display_features
)
VALUES (
  'Basic', 'basic', 0, 0, true, 1,
  'Core AI cost tracking', false, 'Start Free', 'ghost',
  '{
    "limits": {
      "integrations": 1,
      "platform_keys": 1,
      "alert_rules": 1,
      "budget_rules": 1,
      "team_members": 1,
      "monthly_spend_usd": 100
    },
    "usage": {
      "warning_threshold_percent": 80
    },
    "features": {
      "api_gateway": true,
      "analytics": true,
      "advanced_analytics": false,
      "alerts": true,
      "budget_manager": true,
      "ai_playground": false,
      "benchmarks": false,
      "roi_calculator": false,
      "reports": true,
      "csv_export": false,
      "pdf_export": false,
      "premium_models": false,
      "webhooks": false,
      "slack_alerts": false,
      "cost_spike_detection": false,
      "anomaly_detection": false
    },
    "rate_limits": {
      "requests_per_minute": 60,
      "concurrent_requests": 2
    },
    "model_access": {
      "tier": "basic"
    }
  }'::jsonb,
  '[
    {"text":"1 team member","included":true},
    {"text":"Core cost tracking","included":true},
    {"text":"Basic analytics","included":true},
    {"text":"1 active budget","included":true},
    {"text":"Advanced integrations","included":false},
    {"text":"ROI Calculator","included":false}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  system_limits = EXCLUDED.system_limits,
  display_features = EXCLUDED.display_features,
  sort_order = EXCLUDED.sort_order,
  lemonsqueezy_variant_id_monthly = NULL,
  lemonsqueezy_variant_id_annual = NULL;

-- 3. Update 'pro' to 'professional' if it exists, or insert it.
-- Since slug is unique, we must handle renaming safely.
UPDATE public.plans 
SET slug = 'professional_temp' 
WHERE slug = 'pro';

UPDATE public.plans 
SET slug = 'professional', name = 'Professional', is_active = true 
WHERE slug = 'professional_temp';

INSERT INTO public.plans (
  name, slug, price_monthly, price_annual, is_active, sort_order,
  tagline, is_popular, cta_text, cta_variant,
  system_limits, display_features
)
VALUES (
  'Professional', 'professional', 49, 39, true, 2,
  'For growing teams', true, 'Start Free Trial', 'primary',
  '{
    "limits": {
      "integrations": 5,
      "platform_keys": 5,
      "alert_rules": 10,
      "budget_rules": 5,
      "team_members": 5,
      "monthly_spend_usd": 1000
    },
    "usage": {
      "warning_threshold_percent": 80
    },
    "features": {
      "api_gateway": true,
      "analytics": true,
      "advanced_analytics": true,
      "alerts": true,
      "budget_manager": true,
      "ai_playground": true,
      "benchmarks": true,
      "roi_calculator": true,
      "reports": true,
      "csv_export": true,
      "pdf_export": true,
      "premium_models": false,
      "webhooks": true,
      "slack_alerts": true,
      "cost_spike_detection": false,
      "anomaly_detection": false
    },
    "rate_limits": {
      "requests_per_minute": 120,
      "concurrent_requests": 5
    },
    "model_access": {
      "tier": "standard"
    }
  }'::jsonb,
  '[
    {"text":"5 team members","included":true},
    {"text":"Advanced analytics","included":true},
    {"text":"ROI Calculator","included":true},
    {"text":"Slack integrations","included":true},
    {"text":"CSV & PDF Exports","included":true},
    {"text":"Premium models","included":false}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  system_limits = EXCLUDED.system_limits,
  display_features = EXCLUDED.display_features,
  sort_order = EXCLUDED.sort_order,
  lemonsqueezy_variant_id_monthly = NULL,
  lemonsqueezy_variant_id_annual = NULL;

-- 4. Update Business Plan
INSERT INTO public.plans (
  name, slug, price_monthly, price_annual, is_active, sort_order,
  tagline, is_popular, cta_text, cta_variant,
  system_limits, display_features
)
VALUES (
  'Business', 'business', 199, 159, true, 3,
  'Scale with confidence', false, 'Start Free Trial', 'ghost',
  '{
    "limits": {
      "integrations": 25,
      "platform_keys": 25,
      "alert_rules": 50,
      "budget_rules": 25,
      "team_members": 25,
      "monthly_spend_usd": 10000
    },
    "usage": {
      "warning_threshold_percent": 80
    },
    "features": {
      "api_gateway": true,
      "analytics": true,
      "advanced_analytics": true,
      "alerts": true,
      "budget_manager": true,
      "ai_playground": true,
      "benchmarks": true,
      "roi_calculator": true,
      "reports": true,
      "csv_export": true,
      "pdf_export": true,
      "premium_models": true,
      "webhooks": true,
      "slack_alerts": true,
      "cost_spike_detection": false,
      "anomaly_detection": false
    },
    "rate_limits": {
      "requests_per_minute": 300,
      "concurrent_requests": 20
    },
    "model_access": {
      "tier": "premium"
    }
  }'::jsonb,
  '[
    {"text":"25 team members","included":true},
    {"text":"Premium models","included":true},
    {"text":"High usage limits","included":true},
    {"text":"Custom webhooks","included":true},
    {"text":"Advanced alerting","included":true},
    {"text":"Dedicated SLA","included":false}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  system_limits = EXCLUDED.system_limits,
  display_features = EXCLUDED.display_features,
  sort_order = EXCLUDED.sort_order,
  lemonsqueezy_variant_id_monthly = NULL,
  lemonsqueezy_variant_id_annual = NULL;


-- 5. Update Enterprise Plan
INSERT INTO public.plans (
  name, slug, price_monthly, price_annual, is_active, sort_order,
  tagline, is_popular, cta_text, cta_variant,
  system_limits, display_features
)
VALUES (
  'Enterprise', 'enterprise', 999, 899, true, 4,
  'For large organizations', false, 'Contact Sales', 'enterprise',
  '{
    "limits": {
      "integrations": null,
      "platform_keys": null,
      "alert_rules": null,
      "budget_rules": null,
      "team_members": null,
      "monthly_spend_usd": null
    },
    "usage": {
      "warning_threshold_percent": 80
    },
    "features": {
      "api_gateway": true,
      "analytics": true,
      "advanced_analytics": true,
      "alerts": true,
      "budget_manager": true,
      "ai_playground": true,
      "benchmarks": true,
      "roi_calculator": true,
      "reports": true,
      "csv_export": true,
      "pdf_export": true,
      "premium_models": true,
      "webhooks": true,
      "slack_alerts": true,
      "cost_spike_detection": false,
      "anomaly_detection": false
    },
    "rate_limits": {
      "requests_per_minute": null,
      "concurrent_requests": null
    },
    "model_access": {
      "tier": "all"
    }
  }'::jsonb,
  '[
    {"text":"Unlimited everything","included":true},
    {"text":"Custom integrations","included":true},
    {"text":"Custom retention","included":true},
    {"text":"Direct billing","included":true}
  ]'::jsonb
)
ON CONFLICT (slug) DO UPDATE SET 
  name = EXCLUDED.name,
  is_active = true,
  system_limits = EXCLUDED.system_limits,
  display_features = EXCLUDED.display_features,
  sort_order = EXCLUDED.sort_order,
  lemonsqueezy_variant_id_monthly = NULL,
  lemonsqueezy_variant_id_annual = NULL;

-- 6. Ensure any existing test subscriptions or variants mapping are stripped
-- from the ACTIVE plans to prep for live values.
UPDATE public.plans 
SET 
  lemonsqueezy_variant_id_monthly = NULL, 
  lemonsqueezy_variant_id_annual = NULL 
WHERE slug IN ('basic', 'professional', 'business', 'enterprise');

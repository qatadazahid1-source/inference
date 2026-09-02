-- Add system_limits JSONB column to plans table
ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS system_limits jsonb DEFAULT '{}'::jsonb;

-- Seed default limits for existing plans
-- Starter: 1 integration, 1 platform key, 1 alert, 100 USD max spend, basic analytics
UPDATE public.plans SET system_limits = '{"max_integrations": 1, "max_platform_keys": 1, "max_alerts": 1, "advanced_analytics": false, "max_monthly_spend": 100}'::jsonb WHERE slug = 'starter';

-- Professional: 3 integrations, 3 platform keys, 5 alerts, 500 USD max spend, advanced analytics
UPDATE public.plans SET system_limits = '{"max_integrations": 3, "max_platform_keys": 3, "max_alerts": 5, "advanced_analytics": true, "max_monthly_spend": 500}'::jsonb WHERE slug = 'professional';

-- Business: 10 integrations, 10 platform keys, 20 alerts, 5000 USD max spend, advanced analytics
UPDATE public.plans SET system_limits = '{"max_integrations": 10, "max_platform_keys": 10, "max_alerts": 20, "advanced_analytics": true, "max_monthly_spend": 5000}'::jsonb WHERE slug = 'business';

-- Enterprise: Unlimited (represented by very large numbers)
UPDATE public.plans SET system_limits = '{"max_integrations": 9999, "max_platform_keys": 9999, "max_alerts": 9999, "advanced_analytics": true, "max_monthly_spend": 999999}'::jsonb WHERE slug = 'enterprise';

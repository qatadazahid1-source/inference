-- Add access_tier to model_pricing
ALTER TABLE public.model_pricing
  ADD COLUMN IF NOT EXISTS access_tier text NOT NULL DEFAULT 'basic';

-- Restructure existing system_limits in plans table
-- Starter
UPDATE public.plans SET system_limits = '{
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
    "ai_playground": true,
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
}'::jsonb WHERE slug = 'starter';

-- Professional
UPDATE public.plans SET system_limits = '{
  "limits": {
    "integrations": 3,
    "platform_keys": 3,
    "alert_rules": 5,
    "budget_rules": 3,
    "team_members": 5,
    "monthly_spend_usd": 500
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
    "cost_spike_detection": true,
    "anomaly_detection": true
  },
  "rate_limits": {
    "requests_per_minute": 120,
    "concurrent_requests": 5
  },
  "model_access": {
    "tier": "standard"
  }
}'::jsonb WHERE slug = 'professional';

-- Business
UPDATE public.plans SET system_limits = '{
  "limits": {
    "integrations": 10,
    "platform_keys": 10,
    "alert_rules": 20,
    "budget_rules": 10,
    "team_members": 25,
    "monthly_spend_usd": 5000
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
    "cost_spike_detection": true,
    "anomaly_detection": true
  },
  "rate_limits": {
    "requests_per_minute": 300,
    "concurrent_requests": 20
  },
  "model_access": {
    "tier": "premium"
  }
}'::jsonb WHERE slug = 'business';

-- Enterprise
UPDATE public.plans SET system_limits = '{
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
    "cost_spike_detection": true,
    "anomaly_detection": true
  },
  "rate_limits": {
    "requests_per_minute": null,
    "concurrent_requests": null
  },
  "model_access": {
    "tier": "all"
  }
}'::jsonb WHERE slug = 'enterprise';

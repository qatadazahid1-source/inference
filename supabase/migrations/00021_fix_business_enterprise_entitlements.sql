-- ============================================================================
-- Migration: 00021_fix_business_enterprise_entitlements.sql
-- Purpose:
--   1. Enable hard_budget_enforcement, cost_spike_detection on Business and Enterprise plans
--   2. Enable anomaly_detection on Enterprise plan
--   3. Ensure xlsx_export, csv_export, and pdf_export are aligned across Professional, Business, and Enterprise
-- ============================================================================

-- 1. Update Business plan features in system_limits
UPDATE public.plans
SET system_limits = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        system_limits,
        '{features,hard_budget_enforcement}',
        'true'::jsonb,
        true
      ),
      '{features,cost_spike_detection}',
      'true'::jsonb,
      true
    ),
    '{features,anomaly_detection}',
    'false'::jsonb,
    true
  ),
  '{features,xlsx_export}',
  'true'::jsonb,
  true
)
WHERE slug = 'business';

-- 2. Update Enterprise plan features in system_limits
UPDATE public.plans
SET system_limits = jsonb_set(
  jsonb_set(
    jsonb_set(
      jsonb_set(
        system_limits,
        '{features,hard_budget_enforcement}',
        'true'::jsonb,
        true
      ),
      '{features,cost_spike_detection}',
      'true'::jsonb,
      true
    ),
    '{features,anomaly_detection}',
    'true'::jsonb,
    true
  ),
  '{features,xlsx_export}',
  'true'::jsonb,
  true
)
WHERE slug = 'enterprise';

-- 3. Update Professional plan features (ensure xlsx_export is aligned with csv_export)
UPDATE public.plans
SET system_limits = jsonb_set(
  jsonb_set(
    system_limits,
    '{features,hard_budget_enforcement}',
    'false'::jsonb,
    true
  ),
  '{features,xlsx_export}',
  'true'::jsonb,
  true
)
WHERE slug = 'professional';

-- 4. Update Basic plan features
UPDATE public.plans
SET system_limits = jsonb_set(
  jsonb_set(
    system_limits,
    '{features,hard_budget_enforcement}',
    'false'::jsonb,
    true
  ),
  '{features,xlsx_export}',
  'false'::jsonb,
  true
)
WHERE slug = 'basic';

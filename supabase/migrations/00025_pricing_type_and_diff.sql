-- ============================================================================
-- Migration: 00025_pricing_type_and_diff.sql
-- Purpose:
--   Add pricing_type ('custom_rate' | 'global_update') and price discrepancy
--   tracking columns to user_model_submissions.
-- ============================================================================

ALTER TABLE IF EXISTS public.user_model_submissions
  ADD COLUMN IF NOT EXISTS pricing_type TEXT DEFAULT 'custom_rate',
  ADD COLUMN IF NOT EXISTS price_diff_detected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS catalog_input_cost_per_1k NUMERIC(14,8),
  ADD COLUMN IF NOT EXISTS catalog_output_cost_per_1k NUMERIC(14,8);

COMMENT ON COLUMN public.user_model_submissions.pricing_type IS
  'Indicates whether the submission is an organization-specific custom rate or a global provider update';

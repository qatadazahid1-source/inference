-- ============================================================================
-- Migration: 00016_pricing_source_provenance_and_staging.sql
-- Purpose:
--   1. Add source provenance columns to model_pricing (additive, no data loss)
--   2. Add source columns to pricing_audit_log (additive)
--   3. Create pricing_import_staging table for Fetch→Preview→Apply workflow
--   4. Create unique index to prevent duplicate active provider+model rows
-- ============================================================================

-- 1. Add source provenance to model_pricing (all nullable so existing rows unaffected)
ALTER TABLE public.model_pricing
  ADD COLUMN IF NOT EXISTS source_type      TEXT,
  ADD COLUMN IF NOT EXISTS source_name      TEXT,
  ADD COLUMN IF NOT EXISTS source_url       TEXT,
  ADD COLUMN IF NOT EXISTS source_fetched_at TIMESTAMPTZ;

-- 2. Add source tracking to pricing_audit_log
ALTER TABLE public.pricing_audit_log
  ADD COLUMN IF NOT EXISTS source_type     TEXT,
  ADD COLUMN IF NOT EXISTS source_name     TEXT,
  ADD COLUMN IF NOT EXISTS old_source_type TEXT,
  ADD COLUMN IF NOT EXISTS old_source_name TEXT;

-- 3. Create pricing_import_staging table
-- This is the staging/preview layer. Data here is NEVER production data.
-- Rows are cleared once applied or cancelled.
CREATE TABLE IF NOT EXISTS public.pricing_import_staging (
  id                  UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  import_id           UUID          NOT NULL,           -- groups all rows from one fetch session
  provider            TEXT          NOT NULL,           -- e.g. 'openai', 'groq', 'anthropic'
  model               TEXT          NOT NULL,           -- provider-specific model ID
  input_cost_per_1k   NUMERIC(10,8),                   -- null = not available from source
  output_cost_per_1k  NUMERIC(10,8),
  context_window      INTEGER,
  source_type         TEXT          NOT NULL,           -- 'pricepertoken', 'portkey', 'openrouter', etc.
  source_name         TEXT          NOT NULL,           -- human-readable source name
  source_url          TEXT,                             -- canonical URL or endpoint
  fetched_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),

  -- Classification result from diff engine
  status              TEXT          NOT NULL DEFAULT 'pending',
  -- pending | new | same | changed | conflict | duplicate | invalid | applied | skipped

  -- DB record if provider+model already exists
  db_record_id        UUID,                             -- model_pricing.id
  db_input_cost       NUMERIC(10,8),                   -- current DB value
  db_output_cost      NUMERIC(10,8),                   -- current DB value
  db_source_type      TEXT,                             -- current source in DB

  -- Source priority comparison
  incoming_priority   INTEGER,                          -- source priority score of incoming data
  existing_priority   INTEGER,                          -- source priority score of DB data

  conflict_note       TEXT,                             -- human-readable explanation

  -- Timestamps
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  applied_at          TIMESTAMPTZ,
  applied_by          TEXT                              -- 'SYSTEM' or user id
);

-- Index for fast lookup by import_id
CREATE INDEX IF NOT EXISTS idx_pricing_import_staging_import_id
  ON public.pricing_import_staging(import_id);

-- Index for fast lookup by provider+model in staging
CREATE INDEX IF NOT EXISTS idx_pricing_import_staging_provider_model
  ON public.pricing_import_staging(provider, model);

-- 4. Create a partial unique index on model_pricing to enforce:
--    only ONE active (is_active=true) row per provider+model combination
--    This prevents duplicates while allowing historical/inactive rows.
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_pricing_unique_active_provider_model
  ON public.model_pricing(provider, model)
  WHERE (is_active = true);

-- 5. Add source_priority config table for configurable source trust
CREATE TABLE IF NOT EXISTS public.pricing_source_config (
  source_type         TEXT          PRIMARY KEY,
  source_name         TEXT          NOT NULL,
  priority            INTEGER       NOT NULL DEFAULT 50,  -- higher = more trusted
  description         TEXT,
  is_active           BOOLEAN       NOT NULL DEFAULT true,
  created_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Seed default source priorities
INSERT INTO public.pricing_source_config (source_type, source_name, priority, description)
VALUES
  ('direct_provider',  'Direct Provider API',     100, 'Official provider API endpoint (e.g. OpenAI /v1/models)'),
  ('official_catalog', 'Official Pricing Catalog', 90, 'Official provider pricing page/catalog JSON'),
  ('groq',             'Groq Direct API',           85, 'Groq official API - direct provider'),
  ('pricepertoken',    'Price Per Token MCP',        80, 'Price Per Token aggregator MCP server'),
  ('openrouter',       'OpenRouter',                 70, 'OpenRouter aggregated pricing'),
  ('portkey',          'Portkey GitHub',             65, 'Portkey AI GitHub pricing repository'),
  ('manual',           'Manual Entry',               40, 'Manually entered by admin'),
  ('other',            'Other / Unknown',            50, 'Unknown or uncategorized source')
ON CONFLICT (source_type) DO NOTHING;

-- Enable RLS on new tables (mirrors existing model_pricing RLS pattern)
ALTER TABLE public.pricing_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_source_config ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (backend uses service role key)
CREATE POLICY "staging_service_role_all"
  ON public.pricing_import_staging
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "source_config_select_all"
  ON public.pricing_source_config
  FOR SELECT
  USING (true);

-- Comment the tables
COMMENT ON TABLE public.pricing_import_staging IS
  'Temporary staging area for pricing imports. FETCH writes here. APPLY moves to model_pricing. CANCEL clears here. Never directly production data.';

COMMENT ON TABLE public.pricing_source_config IS
  'Configurable source priority registry. Higher priority = more trusted source for conflict resolution.';

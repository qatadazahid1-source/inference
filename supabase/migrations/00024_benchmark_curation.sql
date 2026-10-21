-- ============================================================================
-- Migration: 00024_benchmark_curation.sql
-- Purpose:
--   Add curation fields to model_pricing so admins can select up to 20
--   featured premium models for the Benchmarks dashboard with custom ordering.
--   Additive and non-destructive: all other rows have is_benchmark_featured = false.
--   The admin catalog continues to access all models.
-- ============================================================================

-- 1. Add curation columns
ALTER TABLE public.model_pricing
  ADD COLUMN IF NOT EXISTS is_benchmark_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS benchmark_rank        INTEGER DEFAULT NULL;

-- 2. Index for high-performance retrieval of only the curated models
CREATE INDEX IF NOT EXISTS idx_model_pricing_benchmark_featured
  ON public.model_pricing(is_benchmark_featured, benchmark_rank)
  WHERE is_benchmark_featured = true;

-- 3. Initial seed: Curate verified active flagship models across providers (max 20)
-- Selects from real existing records with verified pricing
WITH candidates AS (
  SELECT id, ROW_NUMBER() OVER (
    ORDER BY
      CASE provider
        WHEN 'openai' THEN 1
        WHEN 'anthropic' THEN 2
        WHEN 'google' THEN 3
        WHEN 'groq' THEN 4
        ELSE 5
      END,
      output_cost_per_1k DESC
  ) as rnk
  FROM public.model_pricing
  WHERE is_active = true
    AND input_cost_per_1k > 0
    AND output_cost_per_1k > 0
    AND provider IN ('openai', 'anthropic', 'google', 'groq')
  LIMIT 20
)
UPDATE public.model_pricing mp
SET is_benchmark_featured = true,
    benchmark_rank = c.rnk
FROM candidates c
WHERE mp.id = c.id;

COMMENT ON COLUMN public.model_pricing.is_benchmark_featured IS
  'True if this model is selected by admins to appear in the curated Benchmark section (max 20).';

COMMENT ON COLUMN public.model_pricing.benchmark_rank IS
  'Display order for curated models in the Benchmark section (1 = first).';

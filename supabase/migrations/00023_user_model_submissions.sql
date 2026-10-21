-- ============================================================================
-- Migration: 00023_user_model_submissions.sql
-- Purpose:
--   Allow authenticated users to submit new AI providers and models for admin
--   review. Approved entries are promoted into the canonical model_pricing and
--   ai_providers catalogs with a full audit trail.
--
--   Tables created (additive, no changes to existing tables):
--     public.user_provider_submissions
--     public.user_model_submissions
--   All columns are nullable-safe; existing production data is untouched.
-- ============================================================================

-- ── 1. User Provider Submissions ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_provider_submissions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  submitted_by      UUID          NOT NULL,           -- auth.users.id
  organization_id   UUID          NOT NULL,           -- organizations.id

  -- Provider details (user-supplied, not yet validated)
  name              TEXT          NOT NULL,           -- display name, e.g. "DeepMind"
  provider_id       TEXT          NOT NULL,           -- slug used in API routing, e.g. "deepmind"
  website_url       TEXT,                             -- provider homepage
  docs_url          TEXT,                             -- API docs URL
  base_url          TEXT,                             -- API base URL, e.g. https://api.example.com/v1
  protocol          TEXT,                             -- 'openai_compatible' | 'custom' | 'anthropic' | etc.
  notes             TEXT,                             -- free-text notes from submitter

  -- Workflow
  status            TEXT          NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected

  rejection_reason  TEXT,                             -- filled by admin on reject
  reviewed_by       UUID,                             -- admin user id
  reviewed_at       TIMESTAMPTZ,

  -- If approved, the created ai_providers row id
  approved_provider_id UUID,

  -- Timestamps
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── 2. User Model Submissions ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_model_submissions (
  id                UUID          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  submitted_by      UUID          NOT NULL,           -- auth.users.id
  organization_id   UUID          NOT NULL,           -- organizations.id

  -- Model identity
  provider          TEXT          NOT NULL,           -- provider slug (matches model_pricing.provider)
  model_id          TEXT          NOT NULL,           -- exact upstream model identifier
  display_name      TEXT          NOT NULL,           -- human-friendly label
  docs_url          TEXT,
  context_window    INTEGER,

  -- Pricing components (JSONB array for flexible multi-component pricing)
  -- Each element: { component_type, unit, price_per_unit, normalized_per_1k }
  -- component_type: 'input_tokens' | 'output_tokens' | 'cached_input' | 'cache_write'
  --                 | 'image_generation' | 'audio_input' | 'audio_output'
  --                 | 'web_search' | 'other'
  pricing_components JSONB        NOT NULL DEFAULT '[]'::jsonb,

  -- Convenience columns (denormalized from pricing_components for fast querying)
  input_cost_per_1k  NUMERIC(14,8),
  output_cost_per_1k NUMERIC(14,8),

  notes             TEXT,

  -- Workflow
  status            TEXT          NOT NULL DEFAULT 'pending',
  -- pending | approved | rejected

  rejection_reason  TEXT,
  reviewed_by       UUID,
  reviewed_at       TIMESTAMPTZ,

  -- If approved, the created model_pricing row id
  approved_model_pricing_id UUID,

  -- Timestamps
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- ── 3. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_provider_submissions_org
  ON public.user_provider_submissions(organization_id);

CREATE INDEX IF NOT EXISTS idx_user_provider_submissions_status
  ON public.user_provider_submissions(status);

CREATE INDEX IF NOT EXISTS idx_user_model_submissions_org
  ON public.user_model_submissions(organization_id);

CREATE INDEX IF NOT EXISTS idx_user_model_submissions_status
  ON public.user_model_submissions(status);

-- Prevent duplicate pending submissions for the same provider_id per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_provider_submissions_unique_pending
  ON public.user_provider_submissions(organization_id, provider_id)
  WHERE status = 'pending';

-- Prevent duplicate pending submissions for the same model per org
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_model_submissions_unique_pending
  ON public.user_model_submissions(organization_id, provider, model_id)
  WHERE status = 'pending';

-- ── 4. Enable RLS ─────────────────────────────────────────────────────────────
ALTER TABLE public.user_provider_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_model_submissions    ENABLE ROW LEVEL SECURITY;

-- ── 5. RLS Policies ───────────────────────────────────────────────────────────
-- Service-role (backend) can do anything - this is the primary access path.
CREATE POLICY "provider_submissions_service_role_all"
  ON public.user_provider_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

CREATE POLICY "model_submissions_service_role_all"
  ON public.user_model_submissions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ── 6. Comments ───────────────────────────────────────────────────────────────
COMMENT ON TABLE public.user_provider_submissions IS
  'User-submitted AI providers awaiting admin review. Approved entries are promoted to ai_providers.';

COMMENT ON TABLE public.user_model_submissions IS
  'User-submitted AI models awaiting admin review. Approved entries are promoted to model_pricing. pricing_components JSONB holds flexible per-component pricing.';

COMMENT ON COLUMN public.user_model_submissions.pricing_components IS
  'Array of pricing component objects. Each: {component_type, unit, price_per_unit, normalized_per_1k}. Supports tokens, images, audio, web search, etc.';

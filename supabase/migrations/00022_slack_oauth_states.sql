-- ============================================================================
-- Migration 00022: Slack OAuth State Store (Replay & CSRF Protection)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.slack_oauth_states (
  state               text        PRIMARY KEY,
  user_id             uuid        NOT NULL,
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  status              text        NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'consumed')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,
  consumed_at         timestamptz
);

-- Index for expiration lookups and cleanup
CREATE INDEX IF NOT EXISTS idx_slack_oauth_states_expires_at ON public.slack_oauth_states(expires_at);

-- Row Level Security
ALTER TABLE public.slack_oauth_states ENABLE ROW LEVEL SECURITY;

-- Service role has full access; members can view their org's pending states
CREATE POLICY "slack_oauth_states: org members can read"
  ON public.slack_oauth_states
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ============================================================================
-- Migration 00017: New features — Slack, Webhooks, Anomaly Detection,
--                  Recurring Reports, PDF/XLSX support
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. SLACK INTEGRATIONS
--    One webhook URL per organization. Org-level config, not user-level.
--    Stores incoming webhook URL (encrypted at app layer via existing
--    CREDENTIAL_ENCRYPTION_KEY) for dispatching Slack alerts.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.slack_integrations (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  webhook_url_enc     text        NOT NULL,   -- AES-256-GCM encrypted via encryption.js
  channel_name        text,                  -- display-only, e.g. "#alerts"
  workspace_name      text,                  -- display-only, e.g. "Acme Corp"
  is_active           boolean     NOT NULL DEFAULT true,
  created_by          uuid        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id)  -- one active Slack integration per org
);

ALTER TABLE public.slack_integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slack_integrations: org members can read/write"
  ON public.slack_integrations
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- 2. WEBHOOK ENDPOINTS
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id     uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url                 text        NOT NULL,
  description         text,
  signing_secret      text        NOT NULL,  -- random hex, used for HMAC-SHA256 signing
  enabled             boolean     NOT NULL DEFAULT true,
  created_by          uuid        NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_endpoints: org members can read/write"
  ON public.webhook_endpoints
  FOR ALL
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- 3. WEBHOOK SUBSCRIPTIONS (which events each endpoint subscribes to)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_subscriptions (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id uuid        NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_type          text        NOT NULL,  -- e.g. 'budget.threshold_reached'
  enabled             boolean     NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_subscriptions: via endpoint ownership"
  ON public.webhook_subscriptions
  FOR ALL
  USING (
    webhook_endpoint_id IN (
      SELECT id FROM public.webhook_endpoints
      WHERE organization_id IN (
        SELECT organization_id FROM public.organization_members
        WHERE user_id = auth.uid() AND status = 'active'
      )
    )
  );

-- ----------------------------------------------------------------------------
-- 4. WEBHOOK DELIVERIES (audit log + retry state)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id                  uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id uuid        NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  organization_id     uuid        NOT NULL,
  event_type          text        NOT NULL,
  payload             jsonb       NOT NULL,
  status              text        NOT NULL DEFAULT 'pending',  -- pending | delivered | failed | retrying
  http_status         integer,
  attempt_count       integer     NOT NULL DEFAULT 0,
  last_attempt_at     timestamptz,
  next_retry_at       timestamptz,
  response_summary    text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_endpoint ON public.webhook_deliveries(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status   ON public.webhook_deliveries(status, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_org      ON public.webhook_deliveries(organization_id, created_at DESC);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "webhook_deliveries: org members can read"
  ON public.webhook_deliveries
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ----------------------------------------------------------------------------
-- 5. ANOMALIES
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.anomalies (
  id              uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id uuid        NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type            text        NOT NULL,      -- 'cost_spike' | 'token_spike' | 'request_spike' | 'model_switch'
  severity        text        NOT NULL,      -- 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  metric          text        NOT NULL,      -- e.g. 'cost_usd' | 'total_tokens'
  baseline        numeric     NOT NULL,      -- rolling average
  observed_value  numeric     NOT NULL,      -- actual value that triggered
  deviation_pct   numeric     NOT NULL,      -- % above baseline
  window_hours    integer     NOT NULL,      -- detection window used
  detected_at     timestamptz NOT NULL DEFAULT now(),
  source_data     jsonb,                     -- raw aggregation used for detection
  status          text        NOT NULL DEFAULT 'open',  -- 'open' | 'acknowledged' | 'resolved'
  notified        boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anomalies_org       ON public.anomalies(organization_id, detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_anomalies_status    ON public.anomalies(status);
CREATE INDEX IF NOT EXISTS idx_anomalies_notified  ON public.anomalies(notified, detected_at);

ALTER TABLE public.anomalies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anomalies: org members can read"
  ON public.anomalies
  FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.organization_members
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Service role can insert (backend only)
CREATE POLICY "anomalies: service role can insert"
  ON public.anomalies
  FOR INSERT
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. EXTEND REPORTS table for recurring report scheduling
--    Add columns only if they don't exist yet.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'next_run_at'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN next_run_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'last_run_at'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN last_run_at timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'last_run_status'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN last_run_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'recipients'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN recipients jsonb DEFAULT '[]'::jsonb;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'reports' AND column_name = 'enabled'
  ) THEN
    ALTER TABLE public.reports ADD COLUMN enabled boolean NOT NULL DEFAULT true;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS idx_reports_recurring ON public.reports(recurring, next_run_at)
  WHERE recurring = true AND enabled = true;

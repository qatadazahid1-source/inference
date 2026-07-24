-- ============================================================================
-- Inference Intelligence — Supabase Database Schema
-- ============================================================================
-- Run this entire file in the Supabase SQL Editor (Project → SQL Editor)
-- or paste it into a new Supabase migration.
-- ============================================================================

-- 0. Extensions
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Enums
-- ============================================================================
CREATE TYPE member_role      AS ENUM ('owner', 'admin', 'manager', 'analyst', 'viewer');
CREATE TYPE member_status    AS ENUM ('active', 'invited', 'suspended');
CREATE TYPE sub_status       AS ENUM ('active', 'trialing', 'past_due', 'cancelled', 'paused');
CREATE TYPE billing_cycle    AS ENUM ('monthly', 'annual');
CREATE TYPE invoice_status   AS ENUM ('paid', 'pending', 'failed', 'refunded');
CREATE TYPE payment_type     AS ENUM ('card', 'bank_account', 'paypal');
CREATE TYPE ai_provider      AS ENUM ('openai', 'anthropic', 'google', 'azure', 'cohere', 'mistral', 'replicate', 'bedrock', 'groq', 'huggingface');
CREATE TYPE integration_status AS ENUM ('active', 'inactive', 'error');
CREATE TYPE budget_scope     AS ENUM ('organization', 'team', 'project', 'provider', 'model');
CREATE TYPE budget_period    AS ENUM ('monthly', 'quarterly', 'annual');
CREATE TYPE alert_type       AS ENUM ('budget_threshold', 'cost_anomaly', 'model_price_change', 'goal_achieved', 'security');
CREATE TYPE alert_severity   AS ENUM ('info', 'warning', 'critical');
CREATE TYPE alert_condition  AS ENUM ('budget_percent', 'cost_spike', 'daily_cost', 'model_latency');
CREATE TYPE report_type      AS ENUM ('executive_summary', 'engineering', 'finance', 'compliance', 'benchmark', 'custom');
CREATE TYPE report_format    AS ENUM ('pdf', 'csv', 'xlsx');
CREATE TYPE report_status    AS ENUM ('pending', 'generating', 'ready', 'failed');
CREATE TYPE login_status     AS ENUM ('success', 'failed', 'blocked');
CREATE TYPE tfa_method       AS ENUM ('totp', 'sms', 'webauthn');

-- 2. Tables
-- ============================================================================

-- 2a. Users (extends Supabase auth.users)
CREATE TABLE public.users (
  id              UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           TEXT        NOT NULL,
  full_name       TEXT        NOT NULL DEFAULT '',
  avatar_url      TEXT,
  job_title       TEXT,
  phone_number    TEXT,
  timezone        TEXT        NOT NULL DEFAULT 'UTC',
  language        TEXT        NOT NULL DEFAULT 'en',
  email_verified  BOOLEAN     NOT NULL DEFAULT false,
  is_active       BOOLEAN     NOT NULL DEFAULT true,
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2b. Organizations
CREATE TABLE public.organizations (
  id                 UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name               TEXT        NOT NULL,
  slug               TEXT        NOT NULL UNIQUE,
  website            TEXT,
  industry           TEXT,
  company_size       TEXT,
  country            TEXT,
  default_currency   TEXT        NOT NULL DEFAULT 'USD',
  default_timezone   TEXT        NOT NULL DEFAULT 'UTC',
  logo_url           TEXT,
  primary_color      TEXT,
  custom_domain      TEXT,
  plan_id            UUID,
  billing_email      TEXT,
  tax_id             TEXT,
  billing_address    JSONB,
  stripe_customer_id TEXT,
  is_active          BOOLEAN     NOT NULL DEFAULT true,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2c. Organization Members
CREATE TABLE public.organization_members (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role              member_role     NOT NULL DEFAULT 'analyst',
  status            member_status   NOT NULL DEFAULT 'invited',
  invited_by        UUID            REFERENCES public.users(id) ON DELETE SET NULL,
  invited_at        TIMESTAMPTZ,
  joined_at         TIMESTAMPTZ,
  last_active_at    TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- 2d. Invitations
CREATE TABLE public.invitations (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  email             TEXT            NOT NULL,
  role              member_role     NOT NULL DEFAULT 'analyst',
  token             TEXT            NOT NULL UNIQUE,
  invited_by        UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at        TIMESTAMPTZ     NOT NULL DEFAULT (now() + interval '7 days'),
  accepted_at       TIMESTAMPTZ,
  cancelled_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2e. Plans
CREATE TABLE public.plans (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT            NOT NULL,
  slug              TEXT            NOT NULL UNIQUE,
  price_monthly     NUMERIC(10,2)   NOT NULL DEFAULT 0,
  price_annual      NUMERIC(10,2)   NOT NULL DEFAULT 0,
  max_users         INTEGER,
  max_organizations INTEGER,
  max_integrations  INTEGER,
  features          JSONB           NOT NULL DEFAULT '{}',
  is_active         BOOLEAN         NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2f. Subscriptions
CREATE TABLE public.subscriptions (
  id                    UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  plan_id               UUID            NOT NULL REFERENCES public.plans(id) ON DELETE RESTRICT,
  status                sub_status      NOT NULL DEFAULT 'trialing',
  billing_cycle         billing_cycle   NOT NULL DEFAULT 'monthly',
  current_period_start  TIMESTAMPTZ     NOT NULL DEFAULT now(),
  current_period_end    TIMESTAMPTZ     NOT NULL DEFAULT (now() + interval '1 month'),
  trial_ends_at         TIMESTAMPTZ,
  cancelled_at          TIMESTAMPTZ,
  stripe_subscription_id TEXT,
  price_override        NUMERIC(10,2),
  created_at            TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2g. Invoices
CREATE TABLE public.invoices (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number    TEXT            NOT NULL,
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  subscription_id   UUID            REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  amount            NUMERIC(10,2)   NOT NULL,
  currency          TEXT            NOT NULL DEFAULT 'USD',
  status            invoice_status  NOT NULL DEFAULT 'pending',
  description       TEXT,
  pdf_url           TEXT,
  stripe_invoice_id TEXT,
  paid_at           TIMESTAMPTZ,
  due_date          DATE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2h. Payment Methods
CREATE TABLE public.payment_methods (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type              payment_type    NOT NULL,
  card_brand        TEXT,
  card_last_four    TEXT,
  expiry_month      INTEGER,
  expiry_year       INTEGER,
  is_default        BOOLEAN         NOT NULL DEFAULT false,
  stripe_pm_id      TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2i. AI Integrations
CREATE TABLE public.ai_integrations (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID                NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  provider          ai_provider         NOT NULL,
  display_name      TEXT                NOT NULL,
  api_key_hash      TEXT                NOT NULL,
  api_key_preview   TEXT                NOT NULL,
  status            integration_status  NOT NULL DEFAULT 'active',
  last_sync_at      TIMESTAMPTZ,
  error_message     TEXT,
  metadata          JSONB,
  created_by        UUID                NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- 2j. API Usage Logs
CREATE TABLE public.api_usage_logs (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  integration_id    UUID            REFERENCES public.ai_integrations(id) ON DELETE SET NULL,
  provider          TEXT            NOT NULL,
  model             TEXT            NOT NULL,
  request_id        TEXT,
  input_tokens      INTEGER         NOT NULL DEFAULT 0,
  output_tokens     INTEGER         NOT NULL DEFAULT 0,
  total_tokens      INTEGER         NOT NULL DEFAULT 0,
  cost_usd          NUMERIC(12,6)   NOT NULL DEFAULT 0,
  latency_ms        INTEGER,
  task_type         TEXT,
  project_tag       TEXT,
  team_tag          TEXT,
  user_tag          TEXT,
  metadata          JSONB,
  logged_at         TIMESTAMPTZ     NOT NULL DEFAULT now(),
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2k. Budgets
CREATE TABLE public.budgets (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT            NOT NULL,
  scope             budget_scope    NOT NULL DEFAULT 'organization',
  scope_value       TEXT,
  amount            NUMERIC(12,2)   NOT NULL,
  currency          TEXT            NOT NULL DEFAULT 'USD',
  period            budget_period   NOT NULL DEFAULT 'monthly',
  alert_at_50       BOOLEAN         NOT NULL DEFAULT true,
  alert_at_75       BOOLEAN         NOT NULL DEFAULT true,
  alert_at_90       BOOLEAN         NOT NULL DEFAULT true,
  alert_at_100      BOOLEAN         NOT NULL DEFAULT true,
  hard_limit        BOOLEAN         NOT NULL DEFAULT false,
  rollover          BOOLEAN         NOT NULL DEFAULT false,
  is_active         BOOLEAN         NOT NULL DEFAULT true,
  created_by        UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2l. Alerts
CREATE TABLE public.alerts (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  type              alert_type      NOT NULL,
  severity          alert_severity  NOT NULL DEFAULT 'info',
  title             TEXT            NOT NULL,
  message           TEXT            NOT NULL,
  metadata          JSONB,
  is_read           BOOLEAN         NOT NULL DEFAULT false,
  acknowledged_by   UUID            REFERENCES public.users(id) ON DELETE SET NULL,
  acknowledged_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2m. Alert Rules
CREATE TABLE public.alert_rules (
  id                UUID                PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID                NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT                NOT NULL,
  condition_type    alert_condition     NOT NULL,
  condition_value   NUMERIC(12,2)       NOT NULL,
  scope             TEXT,
  channels          JSONB               NOT NULL DEFAULT '{"email": false, "in_app": true, "slack": false, "sms": false}',
  is_active         BOOLEAN             NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  created_by        UUID                NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ         NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ         NOT NULL DEFAULT now()
);

-- 2n. Notification Preferences
CREATE TABLE public.notification_preferences (
  id                      UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  budget_alerts_email     BOOLEAN         NOT NULL DEFAULT true,
  budget_alerts_inapp     BOOLEAN         NOT NULL DEFAULT true,
  budget_alerts_slack     BOOLEAN         NOT NULL DEFAULT false,
  budget_alerts_sms       BOOLEAN         NOT NULL DEFAULT false,
  cost_anomaly_email      BOOLEAN         NOT NULL DEFAULT true,
  cost_anomaly_inapp      BOOLEAN         NOT NULL DEFAULT true,
  cost_anomaly_slack      BOOLEAN         NOT NULL DEFAULT true,
  cost_anomaly_sms        BOOLEAN         NOT NULL DEFAULT false,
  weekly_digest_email     BOOLEAN         NOT NULL DEFAULT true,
  monthly_report_email    BOOLEAN         NOT NULL DEFAULT true,
  team_alerts_inapp       BOOLEAN         NOT NULL DEFAULT true,
  security_alerts_email   BOOLEAN         NOT NULL DEFAULT true,
  security_alerts_sms     BOOLEAN         NOT NULL DEFAULT false,
  billing_alerts_email    BOOLEAN         NOT NULL DEFAULT true,
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2o. Reports
CREATE TABLE public.reports (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name              TEXT            NOT NULL,
  type              report_type     NOT NULL,
  format            report_format   NOT NULL DEFAULT 'pdf',
  parameters        JSONB           NOT NULL DEFAULT '{}',
  file_url          TEXT,
  file_size_bytes   BIGINT,
  status            report_status   NOT NULL DEFAULT 'pending',
  scheduled         BOOLEAN         NOT NULL DEFAULT false,
  schedule_cron     TEXT,
  created_by        UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now(),
  completed_at      TIMESTAMPTZ
);

-- 2p. Security Sessions
CREATE TABLE public.security_sessions (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  device_name       TEXT,
  browser           TEXT,
  os                TEXT,
  ip_address        TEXT,
  location          TEXT,
  user_agent        TEXT,
  is_current        BOOLEAN         NOT NULL DEFAULT false,
  last_active_at    TIMESTAMPTZ     NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ     NOT NULL DEFAULT (now() + interval '30 days'),
  revoked_at        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2q. Login History
CREATE TABLE public.login_history (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address        TEXT,
  device            TEXT,
  location          TEXT,
  status            login_status    NOT NULL DEFAULT 'success',
  failure_reason    TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2r. Two-Factor Auth
CREATE TABLE public.two_factor_auth (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  is_enabled          BOOLEAN         NOT NULL DEFAULT false,
  method              tfa_method,
  totp_secret         TEXT,
  backup_codes        TEXT[],
  backup_codes_used   INTEGER         NOT NULL DEFAULT 0,
  verified_at         TIMESTAMPTZ,
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2s. Audit Logs
CREATE TABLE public.audit_logs (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            REFERENCES public.organizations(id) ON DELETE SET NULL,
  user_id           UUID            REFERENCES public.users(id) ON DELETE SET NULL,
  action            TEXT            NOT NULL,
  resource_type     TEXT            NOT NULL,
  resource_id       TEXT,
  old_values        JSONB,
  new_values        JSONB,
  ip_address        TEXT,
  user_agent        TEXT,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2t. API Keys (for programmatic access)
CREATE TABLE public.api_keys (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id           UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  name              TEXT            NOT NULL,
  key_hash          TEXT            NOT NULL,
  key_preview       TEXT            NOT NULL,
  scopes            TEXT[]          NOT NULL DEFAULT '{}',
  last_used_at      TIMESTAMPTZ,
  expires_at        TIMESTAMPTZ,
  is_active         BOOLEAN         NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2u. Webhooks
CREATE TABLE public.webhooks (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   UUID            NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  url               TEXT            NOT NULL,
  events            TEXT[]          NOT NULL DEFAULT '{}',
  secret            TEXT            NOT NULL,
  is_active         BOOLEAN         NOT NULL DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  failure_count     INTEGER         NOT NULL DEFAULT 0,
  created_by        UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 2v. Model Pricing
CREATE TABLE public.model_pricing (
  id                  UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  provider            TEXT            NOT NULL,
  model               TEXT            NOT NULL,
  input_cost_per_1k   NUMERIC(10,6)   NOT NULL,
  output_cost_per_1k  NUMERIC(10,6)   NOT NULL,
  batch_input_cost    NUMERIC(10,6),
  batch_output_cost   NUMERIC(10,6),
  context_window      INTEGER,
  is_active           BOOLEAN         NOT NULL DEFAULT true,
  effective_from      DATE            NOT NULL DEFAULT CURRENT_DATE,
  effective_to        DATE,
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT now(),
  UNIQUE(provider, model, effective_from)
);

-- 2w. Onboarding Progress
CREATE TABLE public.onboarding_progress (
  id                UUID            PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID            NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  organization_id   UUID            REFERENCES public.organizations(id) ON DELETE SET NULL,
  current_step      INTEGER         NOT NULL DEFAULT 1,
  step_1_completed  BOOLEAN         NOT NULL DEFAULT false,
  step_2_completed  BOOLEAN         NOT NULL DEFAULT false,
  step_3_completed  BOOLEAN         NOT NULL DEFAULT false,
  step_4_completed  BOOLEAN         NOT NULL DEFAULT false,
  step_5_completed  BOOLEAN         NOT NULL DEFAULT false,
  completed_at      TIMESTAMPTZ,
  skipped_at        TIMESTAMPTZ,
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT now()
);

-- 3. Indexes
-- ============================================================================
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_organizations_slug ON public.organizations(slug);
CREATE INDEX idx_org_members_org ON public.organization_members(organization_id);
CREATE INDEX idx_org_members_user ON public.organization_members(user_id);
CREATE INDEX idx_org_members_status ON public.organization_members(status);
CREATE INDEX idx_invitations_org ON public.invitations(organization_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);
CREATE INDEX idx_invitations_email ON public.invitations(email);
CREATE INDEX idx_subscriptions_org ON public.subscriptions(organization_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_invoices_org ON public.invoices(organization_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_payment_methods_org ON public.payment_methods(organization_id);
CREATE INDEX idx_ai_integrations_org ON public.ai_integrations(organization_id);
CREATE INDEX idx_ai_integrations_provider ON public.ai_integrations(provider);
CREATE INDEX idx_api_usage_logs_org ON public.api_usage_logs(organization_id);
CREATE INDEX idx_api_usage_logs_provider ON public.api_usage_logs(provider);
CREATE INDEX idx_api_usage_logs_model ON public.api_usage_logs(model);
CREATE INDEX idx_api_usage_logs_logged_at ON public.api_usage_logs(logged_at);
CREATE INDEX idx_budgets_org ON public.budgets(organization_id);
CREATE INDEX idx_alerts_org ON public.alerts(organization_id);
CREATE INDEX idx_alerts_unread ON public.alerts(organization_id, is_read) WHERE is_read = false;
CREATE INDEX idx_alert_rules_org ON public.alert_rules(organization_id);
CREATE INDEX idx_reports_org ON public.reports(organization_id);
CREATE INDEX idx_reports_status ON public.reports(status);
CREATE INDEX idx_security_sessions_user ON public.security_sessions(user_id);
CREATE INDEX idx_login_history_user ON public.login_history(user_id);
CREATE INDEX idx_login_history_created ON public.login_history(created_at);
CREATE INDEX idx_audit_logs_org ON public.audit_logs(organization_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_api_keys_org ON public.api_keys(organization_id);
CREATE INDEX idx_webhooks_org ON public.webhooks(organization_id);
CREATE INDEX idx_api_usage_logs_org_date ON public.api_usage_logs(organization_id, logged_at DESC);

-- 4. Row Level Security (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- 4a. Helper function: get organizations for the current user
CREATE OR REPLACE FUNCTION public.get_user_organization_ids()
RETURNS UUID[] AS $$
  SELECT COALESCE(ARRAY_AGG(organization_id), '{}')
  FROM public.organization_members
  WHERE user_id = auth.uid()
    AND status = 'active';
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4b. Helper function: check if user has a specific role in an org
CREATE OR REPLACE FUNCTION public.has_org_role(org_id UUID, required_role member_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role = required_role
      AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- Helper: check if user is member of org (any role)
CREATE OR REPLACE FUNCTION public.is_org_member(org_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND status = 'active'
  );
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- 4c. RLS Policies

-- Users: users can only read/update their own record
CREATE POLICY "users_select_own"    ON public.users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own"    ON public.users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert_own"    ON public.users FOR INSERT WITH CHECK (id = auth.uid());

-- Organizations: members can read, admins/owners can update
CREATE POLICY "orgs_select_member"  ON public.organizations FOR SELECT USING (public.is_org_member(id));
CREATE POLICY "orgs_update_admin"   ON public.organizations FOR UPDATE USING (public.has_org_role(id, 'admin'::member_role) OR public.has_org_role(id, 'owner'::member_role));
CREATE POLICY "orgs_insert_own"     ON public.organizations FOR INSERT WITH CHECK (true);

-- Organization Members: members can read, admins manage
CREATE POLICY "org_members_select"  ON public.organization_members FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "org_members_insert"  ON public.organization_members FOR INSERT WITH CHECK (
  public.has_org_role(organization_id, 'admin'::member_role)
  OR public.has_org_role(organization_id, 'owner'::member_role)
);
CREATE POLICY "org_members_update"  ON public.organization_members FOR UPDATE USING (
  public.has_org_role(organization_id, 'admin'::member_role)
  OR public.has_org_role(organization_id, 'owner'::member_role)
);
CREATE POLICY "org_members_delete"  ON public.organization_members FOR DELETE USING (
  public.has_org_role(organization_id, 'admin'::member_role)
  OR public.has_org_role(organization_id, 'owner'::member_role)
);

-- Invitations: org members can read, admins manage
CREATE POLICY "invitations_select"  ON public.invitations FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "invitations_insert"  ON public.invitations FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "invitations_update"  ON public.invitations FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "invitations_delete"  ON public.invitations FOR DELETE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- Plans: anyone can read
CREATE POLICY "plans_select_all"    ON public.plans FOR SELECT USING (true);

-- Subscriptions: org members can read, admins manage
CREATE POLICY "subs_select"         ON public.subscriptions FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "subs_insert"         ON public.subscriptions FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "subs_update"         ON public.subscriptions FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- Invoices: org members can read
CREATE POLICY "invoices_select"     ON public.invoices FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));

-- Payment Methods: org members can read, admins manage
CREATE POLICY "pm_select"           ON public.payment_methods FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "pm_insert"           ON public.payment_methods FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "pm_update"           ON public.payment_methods FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- AI Integrations: org members can read, admins manage
CREATE POLICY "integrations_select" ON public.ai_integrations FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "integrations_insert" ON public.ai_integrations FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "integrations_update" ON public.ai_integrations FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "integrations_delete" ON public.ai_integrations FOR DELETE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- API Usage Logs: org members can read and insert
CREATE POLICY "usage_select"        ON public.api_usage_logs FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "usage_insert"        ON public.api_usage_logs FOR INSERT WITH CHECK (organization_id = ANY(public.get_user_organization_ids()));

-- Budgets: org members can read, admins manage
CREATE POLICY "budgets_select"      ON public.budgets FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "budgets_insert"      ON public.budgets FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "budgets_update"      ON public.budgets FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "budgets_delete"      ON public.budgets FOR DELETE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- Alerts: org members can read and update (mark as read)
CREATE POLICY "alerts_select"       ON public.alerts FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "alerts_update"       ON public.alerts FOR UPDATE USING (organization_id = ANY(public.get_user_organization_ids()));

-- Alert Rules: org members can read, admins manage
CREATE POLICY "alert_rules_select"  ON public.alert_rules FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "alert_rules_insert"  ON public.alert_rules FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "alert_rules_update"  ON public.alert_rules FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "alert_rules_delete"  ON public.alert_rules FOR DELETE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- Notification Preferences: users can read/update their own
CREATE POLICY "notif_prefs_select"  ON public.notification_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "notif_prefs_insert"  ON public.notification_preferences FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "notif_prefs_update"  ON public.notification_preferences FOR UPDATE USING (user_id = auth.uid());

-- Reports: org members can read
CREATE POLICY "reports_select"      ON public.reports FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "reports_insert"      ON public.reports FOR INSERT WITH CHECK (organization_id = ANY(public.get_user_organization_ids()));

-- Security Sessions: users can read/update their own
CREATE POLICY "sessions_select"     ON public.security_sessions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "sessions_update"     ON public.security_sessions FOR UPDATE USING (user_id = auth.uid());

-- Login History: users can read their own
CREATE POLICY "login_hist_select"   ON public.login_history FOR SELECT USING (user_id = auth.uid());

-- Two-Factor Auth: users can read/update their own
CREATE POLICY "tfa_select"          ON public.two_factor_auth FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "tfa_insert"          ON public.two_factor_auth FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "tfa_update"          ON public.two_factor_auth FOR UPDATE USING (user_id = auth.uid());

-- Audit Logs: org members can read
CREATE POLICY "audit_logs_select"   ON public.audit_logs FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));

-- API Keys: org members can read, admins manage
CREATE POLICY "api_keys_select"     ON public.api_keys FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "api_keys_insert"     ON public.api_keys FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "api_keys_update"     ON public.api_keys FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "api_keys_delete"     ON public.api_keys FOR DELETE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- Webhooks: org members can read, admins manage
CREATE POLICY "webhooks_select"     ON public.webhooks FOR SELECT USING (organization_id = ANY(public.get_user_organization_ids()));
CREATE POLICY "webhooks_insert"     ON public.webhooks FOR INSERT WITH CHECK (public.has_org_role(organization_id, 'admin'::member_role));
CREATE POLICY "webhooks_update"     ON public.webhooks FOR UPDATE USING (public.has_org_role(organization_id, 'admin'::member_role));

-- Model Pricing: anyone can read
CREATE POLICY "pricing_select_all"  ON public.model_pricing FOR SELECT USING (true);

-- Onboarding Progress: users can read/update their own
CREATE POLICY "onboarding_select"   ON public.onboarding_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "onboarding_insert"   ON public.onboarding_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "onboarding_update"   ON public.onboarding_progress FOR UPDATE USING (user_id = auth.uid());

-- 5. Triggers & Functions
-- ============================================================================

-- 5a. Auto-create user profile when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url, email_verified)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL),
    NEW.email_confirmed_at IS NOT NULL
  );

  -- Create notification preferences
  INSERT INTO public.notification_preferences (user_id)
  VALUES (NEW.id);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists, then recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- 5b. Auto-update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_orgs_updated_at
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_subs_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_integrations_updated_at
  BEFORE UPDATE ON public.ai_integrations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_budgets_updated_at
  BEFORE UPDATE ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_alert_rules_updated_at
  BEFORE UPDATE ON public.alert_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_notif_prefs_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_tfa_updated_at
  BEFORE UPDATE ON public.two_factor_auth
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_pricing_updated_at
  BEFORE UPDATE ON public.model_pricing
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trg_onboarding_updated_at
  BEFORE UPDATE ON public.onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 5c. Auto-create org and add user as owner when first member signs up
CREATE OR REPLACE FUNCTION public.handle_first_organization()
RETURNS TRIGGER AS $$
BEGIN
  -- Only auto-create org if this is a new user without any org memberships
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members WHERE user_id = NEW.id
  ) THEN
    INSERT INTO public.organizations (name, slug)
    VALUES (
      NEW.full_name || '''s Organization',
      LOWER(REPLACE(REGEXP_REPLACE(NEW.full_name, '[^a-zA-Z0-9\\s]', '', 'g'), ' ', '-')) || '-' || SUBSTRING(NEW.id::text, 1, 8)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Views (convenience views)
-- ============================================================================

-- Spending by provider per month
CREATE OR REPLACE VIEW public.v_monthly_spend_by_provider AS
SELECT
  organization_id,
  provider,
  DATE_TRUNC('month', logged_at) AS month,
  SUM(cost_usd) AS total_cost,
  SUM(total_tokens) AS total_tokens,
  COUNT(*) AS request_count
FROM public.api_usage_logs
GROUP BY organization_id, provider, DATE_TRUNC('month', logged_at);

-- Org member count
CREATE OR REPLACE VIEW public.v_org_member_counts AS
SELECT
  organization_id,
  COUNT(*) FILTER (WHERE status = 'active') AS active_members,
  COUNT(*) FILTER (WHERE status = 'invited') AS invited_members,
  COUNT(*) AS total_members
FROM public.organization_members
GROUP BY organization_id;

-- Budget utilization
CREATE OR REPLACE VIEW public.v_budget_utilization AS
SELECT
  b.id AS budget_id,
  b.organization_id,
  b.name,
  b.amount,
  b.currency,
  b.period,
  COALESCE(SUM(aul.cost_usd), 0) AS spent,
  CASE WHEN b.amount > 0
    THEN ROUND((COALESCE(SUM(aul.cost_usd), 0) / b.amount * 100)::numeric, 1)
    ELSE 0
  END AS utilization_pct
FROM public.budgets b
LEFT JOIN public.api_usage_logs aul
  ON aul.organization_id = b.organization_id
  AND aul.logged_at >= DATE_TRUNC('month', NOW())
GROUP BY b.id, b.organization_id, b.name, b.amount, b.currency, b.period;

-- 7. Seed Data
-- ============================================================================

-- Plans
INSERT INTO public.plans (name, slug, price_monthly, price_annual, max_users, max_integrations, features) VALUES
  ('Starter',     'starter',     49.00,  490.00,  5,   3,   '{"api_access": true, "basic_analytics": true, "email_reports": true, "slack_alerts": false, "custom_integrations": false, "advanced_analytics": false, "team_collaboration": false, "priority_support": false}'::jsonb),
  ('Professional','professional',149.00, 1490.00, 20,  10,  '{"api_access": true, "basic_analytics": true, "email_reports": true, "slack_alerts": true, "custom_integrations": true, "advanced_analytics": false, "team_collaboration": true, "priority_support": false}'::jsonb),
  ('Business',    'business',    499.00, 4990.00, 100, 25,  '{"api_access": true, "basic_analytics": true, "email_reports": true, "slack_alerts": true, "custom_integrations": true, "advanced_analytics": true, "team_collaboration": true, "priority_support": true}'::jsonb),
  ('Enterprise',  'enterprise',  0,      0,       null, null, '{"api_access": true, "basic_analytics": true, "email_reports": true, "slack_alerts": true, "custom_integrations": true, "advanced_analytics": true, "team_collaboration": true, "priority_support": true, "sso": true, "audit_logs": true, "custom_contract": true, "dedicated_support": true}'::jsonb)
ON CONFLICT (slug) DO NOTHING;

-- Model Pricing (common models)
INSERT INTO public.model_pricing (provider, model, input_cost_per_1k, output_cost_per_1k, context_window) VALUES
  ('openai',    'gpt-4o',             2.5000,   10.0000,  128000),
  ('openai',    'gpt-4o-mini',        0.1500,   0.6000,   128000),
  ('openai',    'gpt-4-turbo',        10.0000,  30.0000,  128000),
  ('openai',    'gpt-4',              30.0000,  60.0000,  8192),
  ('openai',    'gpt-3.5-turbo',      0.5000,   1.5000,   16385),
  ('anthropic', 'claude-3-5-sonnet',  3.0000,   15.0000,  200000),
  ('anthropic', 'claude-3-haiku',     0.2500,   1.2500,   200000),
  ('anthropic', 'claude-3-opus',      15.0000,  75.0000,  200000),
  ('google',    'gemini-1.5-pro',     3.5000,   10.5000,  1048576),
  ('google',    'gemini-1.5-flash',   0.0750,   0.3000,   1048576),
  ('google',    'gemini-2.0-flash',   0.1000,   0.4000,   1048576),
  ('mistral',   'mistral-large',      2.0000,   6.0000,   128000),
  ('mistral',   'mistral-small',      0.2000,   0.6000,   32000),
  ('cohere',    'command-r-plus',     2.5000,   10.0000,  128000),
  ('cohere',    'command-r',          0.5000,   1.5000,   128000),
  ('azure',     'gpt-4o',             2.5000,   10.0000,  128000),
  ('bedrock',   'claude-3-5-sonnet',  3.0000,   15.0000,  200000),
  ('groq',      'llama-3.1-70b',      0.5900,   0.7900,   8192),
  ('groq',      'mixtral-8x7b',       0.2400,   0.2400,   32768),
  ('replicate', 'meta-llama-3-70b',   0.6500,   2.7500,   8192),
  ('huggingface','meta-llama-3-70b',  0.6500,   2.7500,   8192)
ON CONFLICT (provider, model, effective_from) DO NOTHING;

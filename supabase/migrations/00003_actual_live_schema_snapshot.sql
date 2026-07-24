-- ================================================================
-- ACTUAL LIVE SCHEMA SNAPSHOT
-- Project : ugkkvwpnjhajlneuhrvs
-- Captured: 2026-07-19T11:39:01.087Z
-- Source  : PostgREST OpenAPI endpoint /rest/v1/
--
-- PURPOSE : This file is the single source of truth for the
--   real, live database structure. When building new features,
--   refer to this snapshot — NOT just the migration files.
--
-- Tables captured : 32
-- RPC functions   : 8
-- ================================================================

-- ================================================================
-- SECTION 1: TABLES  (schema: public)
-- ================================================================

-- ----------------------------------------------------------------
-- TABLE: admin_permission_catalog
-- ----------------------------------------------------------------
/*
CREATE TABLE public.admin_permission_catalog (
  key                                    text NOT NULL,  -- [PRIMARY KEY]
  label                                  text NOT NULL,
  category                               text NOT NULL
);
*/

-- Column reference for admin_permission_catalog:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- key                                    text                 NOT NULL    PRIMARY KEY
-- label                                  text                 NOT NULL    
-- category                               text                 NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: admin_permissions
-- ----------------------------------------------------------------
/*
CREATE TABLE public.admin_permissions (
  id                                     uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  permission                             text NOT NULL,  -- [FK → admin_permission_catalog.key]
  granted_by                             uuid,  -- [FK → users.id]
  granted_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for admin_permissions:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    FK → users.id
-- permission                             text                 NOT NULL    FK → admin_permission_catalog.key
-- granted_by                             uuid                 NULLABLE    FK → users.id
-- granted_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: ai_integrations
--   Connected AI provider integrations. API keys hashed, never stored plaintext.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.ai_integrations (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  provider                               text NOT NULL,
  display_name                           varchar NOT NULL,
  api_key_hash                           varchar NOT NULL,
  api_key_preview                        varchar NOT NULL,
  status                                 text NOT NULL DEFAULT active,
  last_sync_at                           timestamptz,
  error_message                          text,
  metadata                               jsonb,
  created_by                             uuid NOT NULL,  -- [FK → users.id]
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for ai_integrations:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- provider                               text                 NOT NULL    
-- display_name                           varchar              NOT NULL    
-- api_key_hash                           varchar              NOT NULL    
-- api_key_preview                        varchar              NOT NULL    
-- status                                 text                 NOT NULL    
-- last_sync_at                           timestamptz          NULLABLE    
-- error_message                          text                 NULLABLE    
-- metadata                               jsonb                NULLABLE    
-- created_by                             uuid                 NOT NULL    FK → users.id
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: ai_settings
-- ----------------------------------------------------------------
/*
CREATE TABLE public.ai_settings (
  id                                     uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,
  provider                               text NOT NULL,
  api_key                                text,
  model_preference                       text,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for ai_settings:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    
-- provider                               text                 NOT NULL    
-- api_key                                text                 NULLABLE    
-- model_preference                       text                 NULLABLE    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: alert_rules
--   Configurable alert rules. Evaluated by background job.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.alert_rules (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  name                                   varchar NOT NULL,
  condition_type                         text NOT NULL,
  condition_value                        numeric NOT NULL,
  scope                                  varchar,
  channels                               jsonb NOT NULL,
  is_active                              boolean NOT NULL DEFAULT true,
  last_triggered_at                      timestamptz,
  created_by                             uuid NOT NULL,  -- [FK → users.id]
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for alert_rules:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- name                                   varchar              NOT NULL    
-- condition_type                         text                 NOT NULL    
-- condition_value                        numeric              NOT NULL    
-- scope                                  varchar              NULLABLE    
-- channels                               jsonb                NOT NULL    
-- is_active                              boolean              NOT NULL    
-- last_triggered_at                      timestamptz          NULLABLE    
-- created_by                             uuid                 NOT NULL    FK → users.id
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: alerts
--   Triggered alert events. is_read tracked per-user via alert_reads junction.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.alerts (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  type                                   text NOT NULL,
  severity                               text NOT NULL DEFAULT info,
  title                                  varchar NOT NULL,
  message                                text NOT NULL,
  metadata                               jsonb,
  is_read                                boolean NOT NULL DEFAULT false,
  acknowledged_by                        uuid,  -- [FK → users.id]
  acknowledged_at                        timestamptz,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for alerts:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- type                                   text                 NOT NULL    
-- severity                               text                 NOT NULL    
-- title                                  varchar              NOT NULL    
-- message                                text                 NOT NULL    
-- metadata                               jsonb                NULLABLE    
-- is_read                                boolean              NOT NULL    
-- acknowledged_by                        uuid                 NULLABLE    FK → users.id
-- acknowledged_at                        timestamptz          NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: api_keys
--   Developer API keys for Inference Intelligence public API.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.api_keys (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  name                                   varchar NOT NULL,
  key_hash                               varchar NOT NULL,
  key_preview                            varchar NOT NULL,
  scopes                                 jsonb NOT NULL,
  last_used_at                           timestamptz,
  expires_at                             timestamptz,
  is_active                              boolean NOT NULL DEFAULT true,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  integration_id                         uuid  -- [FK → ai_integrations.id]
);
*/

-- Column reference for api_keys:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- user_id                                uuid                 NOT NULL    FK → users.id
-- name                                   varchar              NOT NULL    
-- key_hash                               varchar              NOT NULL    
-- key_preview                            varchar              NOT NULL    
-- scopes                                 jsonb                NOT NULL    
-- last_used_at                           timestamptz          NULLABLE    
-- expires_at                             timestamptz          NULLABLE    
-- is_active                              boolean              NOT NULL    
-- created_at                             timestamptz          NOT NULL    
-- integration_id                         uuid                 NULLABLE    FK → ai_integrations.id

-- ----------------------------------------------------------------
-- TABLE: api_usage_logs
--   Every AI API call tracked here. High-volume table — indexed heavily.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.api_usage_logs (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,
  integration_id                         uuid,  -- [FK → ai_integrations.id]
  provider                               varchar NOT NULL,
  model                                  varchar NOT NULL,
  request_id                             varchar,
  input_tokens                           integer NOT NULL DEFAULT 0,
  output_tokens                          integer NOT NULL DEFAULT 0,
  total_tokens                           integer NOT NULL DEFAULT 0,
  cost_usd                               numeric NOT NULL DEFAULT 0,
  latency_ms                             integer,
  task_type                              varchar,
  project_tag                            varchar,
  team_tag                               varchar,
  user_tag                               varchar,
  metadata                               jsonb,
  logged_at                              timestamptz NOT NULL DEFAULT now(),
  created_at                             timestamptz NOT NULL DEFAULT now(),
  status                                 varchar DEFAULT success,
  error_message                          text
);
*/

-- Column reference for api_usage_logs:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    
-- integration_id                         uuid                 NULLABLE    FK → ai_integrations.id
-- provider                               varchar              NOT NULL    
-- model                                  varchar              NOT NULL    
-- request_id                             varchar              NULLABLE    
-- input_tokens                           integer              NOT NULL    
-- output_tokens                          integer              NOT NULL    
-- total_tokens                           integer              NOT NULL    
-- cost_usd                               numeric              NOT NULL    
-- latency_ms                             integer              NULLABLE    
-- task_type                              varchar              NULLABLE    
-- project_tag                            varchar              NULLABLE    
-- team_tag                               varchar              NULLABLE    
-- user_tag                               varchar              NULLABLE    
-- metadata                               jsonb                NULLABLE    
-- logged_at                              timestamptz          NOT NULL    
-- created_at                             timestamptz          NOT NULL    
-- status                                 varchar              NULLABLE    
-- error_message                          text                 NULLABLE    

-- ----------------------------------------------------------------
-- TABLE: audit_logs
--   Immutable audit trail. No foreign keys on purpose for compliance.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.audit_logs (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid,
  user_id                                uuid,
  action                                 varchar NOT NULL,
  resource_type                          varchar NOT NULL,
  resource_id                            uuid,
  old_values                             jsonb,
  new_values                             jsonb,
  ip_address                             inet,
  user_agent                             text,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for audit_logs:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NULLABLE    
-- user_id                                uuid                 NULLABLE    
-- action                                 varchar              NOT NULL    
-- resource_type                          varchar              NOT NULL    
-- resource_id                            uuid                 NULLABLE    
-- old_values                             jsonb                NULLABLE    
-- new_values                             jsonb                NULLABLE    
-- ip_address                             inet                 NULLABLE    
-- user_agent                             text                 NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: budgets
-- ----------------------------------------------------------------
/*
CREATE TABLE public.budgets (
  id                                     uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  name                                   text NOT NULL,
  scope                                  text NOT NULL DEFAULT organization,
  scope_value                            text,
  total_budget                           numeric NOT NULL,
  current_spend                          numeric NOT NULL DEFAULT 0,
  period                                 text NOT NULL DEFAULT monthly,
  alert_at_50                            boolean NOT NULL DEFAULT true,
  alert_at_75                            boolean NOT NULL DEFAULT true,
  alert_at_90                            boolean NOT NULL DEFAULT true,
  alert_at_100                           boolean NOT NULL DEFAULT true,
  hard_limit                             boolean NOT NULL DEFAULT false,
  created_by                             uuid NOT NULL,  -- [FK → users.id]
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for budgets:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- name                                   text                 NOT NULL    
-- scope                                  text                 NOT NULL    
-- scope_value                            text                 NULLABLE    
-- total_budget                           numeric              NOT NULL    
-- current_spend                          numeric              NOT NULL    
-- period                                 text                 NOT NULL    
-- alert_at_50                            boolean              NOT NULL    
-- alert_at_75                            boolean              NOT NULL    
-- alert_at_90                            boolean              NOT NULL    
-- alert_at_100                           boolean              NOT NULL    
-- hard_limit                             boolean              NOT NULL    
-- created_by                             uuid                 NOT NULL    FK → users.id
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: cost_configs
-- ----------------------------------------------------------------
/*
CREATE TABLE public.cost_configs (
  model                                  text NOT NULL,  -- [PRIMARY KEY]
  input_price_per_1k                     numeric NOT NULL,
  output_price_per_1k                    numeric NOT NULL,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for cost_configs:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- model                                  text                 NOT NULL    PRIMARY KEY
-- input_price_per_1k                     numeric              NOT NULL    
-- output_price_per_1k                    numeric              NOT NULL    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: invitations
--   Pending team invitations. Token expires in 72 hours.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.invitations (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  email                                  varchar NOT NULL,
  role                                   text NOT NULL DEFAULT viewer,
  token                                  varchar NOT NULL,
  invited_by                             uuid NOT NULL,  -- [FK → users.id]
  expires_at                             timestamptz NOT NULL DEFAULT (now() + '72:00:00'::interval),
  accepted_at                            timestamptz,
  cancelled_at                           timestamptz,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for invitations:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- email                                  varchar              NOT NULL    
-- role                                   text                 NOT NULL    
-- token                                  varchar              NOT NULL    
-- invited_by                             uuid                 NOT NULL    FK → users.id
-- expires_at                             timestamptz          NOT NULL    
-- accepted_at                            timestamptz          NULLABLE    
-- cancelled_at                           timestamptz          NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: invoices
--   All billing invoices. PDF stored in S3/R2.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.invoices (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  invoice_number                         varchar NOT NULL,
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  subscription_id                        uuid,  -- [FK → subscriptions.id]
  amount                                 numeric NOT NULL,
  currency                               varchar NOT NULL DEFAULT USD,
  status                                 text NOT NULL DEFAULT pending,
  description                            text,
  pdf_url                                text,
  stripe_invoice_id                      varchar,
  paid_at                                timestamptz,
  due_date                               timestamptz,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for invoices:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- invoice_number                         varchar              NOT NULL    
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- subscription_id                        uuid                 NULLABLE    FK → subscriptions.id
-- amount                                 numeric              NOT NULL    
-- currency                               varchar              NOT NULL    
-- status                                 text                 NOT NULL    
-- description                            text                 NULLABLE    
-- pdf_url                                text                 NULLABLE    
-- stripe_invoice_id                      varchar              NULLABLE    
-- paid_at                                timestamptz          NULLABLE    
-- due_date                               timestamptz          NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: login_history
--   Login audit log for security settings page.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.login_history (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  ip_address                             inet,
  device                                 varchar,
  location                               varchar,
  status                                 text NOT NULL DEFAULT success,
  failure_reason                         varchar,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for login_history:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    FK → users.id
-- ip_address                             inet                 NULLABLE    
-- device                                 varchar              NULLABLE    
-- location                               varchar              NULLABLE    
-- status                                 text                 NOT NULL    
-- failure_reason                         varchar              NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: model_pricing
--   AI provider pricing. Auto-synced by background job when providers change rates.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.model_pricing (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  provider                               varchar NOT NULL,
  model                                  varchar NOT NULL,
  input_cost_per_1k                      numeric NOT NULL,
  output_cost_per_1k                     numeric NOT NULL,
  batch_input_cost                       numeric,
  batch_output_cost                      numeric,
  context_window                         integer,
  is_active                              boolean NOT NULL DEFAULT true,
  effective_from                         timestamptz NOT NULL DEFAULT now(),
  effective_to                           timestamptz,
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for model_pricing:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- provider                               varchar              NOT NULL    
-- model                                  varchar              NOT NULL    
-- input_cost_per_1k                      numeric              NOT NULL    
-- output_cost_per_1k                     numeric              NOT NULL    
-- batch_input_cost                       numeric              NULLABLE    
-- batch_output_cost                      numeric              NULLABLE    
-- context_window                         integer              NULLABLE    
-- is_active                              boolean              NOT NULL    
-- effective_from                         timestamptz          NOT NULL    
-- effective_to                           timestamptz          NULLABLE    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: notification_preferences
--   Per-user notification settings. Created automatically on user signup.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.notification_preferences (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  budget_alerts_email                    boolean NOT NULL DEFAULT true,
  budget_alerts_inapp                    boolean NOT NULL DEFAULT true,
  budget_alerts_slack                    boolean NOT NULL DEFAULT false,
  budget_alerts_sms                      boolean NOT NULL DEFAULT false,
  cost_anomaly_email                     boolean NOT NULL DEFAULT true,
  cost_anomaly_inapp                     boolean NOT NULL DEFAULT true,
  cost_anomaly_slack                     boolean NOT NULL DEFAULT false,
  cost_anomaly_sms                       boolean NOT NULL DEFAULT false,
  weekly_digest_email                    boolean NOT NULL DEFAULT true,
  monthly_report_email                   boolean NOT NULL DEFAULT true,
  team_alerts_inapp                      boolean NOT NULL DEFAULT true,
  security_alerts_email                  boolean NOT NULL DEFAULT true,
  security_alerts_sms                    boolean NOT NULL DEFAULT false,
  billing_alerts_email                   boolean NOT NULL DEFAULT true,
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for notification_preferences:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    FK → users.id
-- budget_alerts_email                    boolean              NOT NULL    
-- budget_alerts_inapp                    boolean              NOT NULL    
-- budget_alerts_slack                    boolean              NOT NULL    
-- budget_alerts_sms                      boolean              NOT NULL    
-- cost_anomaly_email                     boolean              NOT NULL    
-- cost_anomaly_inapp                     boolean              NOT NULL    
-- cost_anomaly_slack                     boolean              NOT NULL    
-- cost_anomaly_sms                       boolean              NOT NULL    
-- weekly_digest_email                    boolean              NOT NULL    
-- monthly_report_email                   boolean              NOT NULL    
-- team_alerts_inapp                      boolean              NOT NULL    
-- security_alerts_email                  boolean              NOT NULL    
-- security_alerts_sms                    boolean              NOT NULL    
-- billing_alerts_email                   boolean              NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: onboarding_progress
--   5-step onboarding wizard progress per user.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.onboarding_progress (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  organization_id                        uuid,  -- [FK → organizations.id]
  current_step                           integer NOT NULL DEFAULT 1,
  step_1_completed                       boolean NOT NULL DEFAULT false,
  step_2_completed                       boolean NOT NULL DEFAULT false,
  step_3_completed                       boolean NOT NULL DEFAULT false,
  step_4_completed                       boolean NOT NULL DEFAULT false,
  step_5_completed                       boolean NOT NULL DEFAULT false,
  completed_at                           timestamptz,
  skipped_at                             timestamptz,
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for onboarding_progress:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    FK → users.id
-- organization_id                        uuid                 NULLABLE    FK → organizations.id
-- current_step                           integer              NOT NULL    
-- step_1_completed                       boolean              NOT NULL    
-- step_2_completed                       boolean              NOT NULL    
-- step_3_completed                       boolean              NOT NULL    
-- step_4_completed                       boolean              NOT NULL    
-- step_5_completed                       boolean              NOT NULL    
-- completed_at                           timestamptz          NULLABLE    
-- skipped_at                             timestamptz          NULLABLE    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: organization_members
--   Links users to organizations. One user can be in multiple orgs with different roles.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.organization_members (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  role                                   text NOT NULL DEFAULT viewer,
  status                                 text NOT NULL DEFAULT active,
  invited_by                             uuid,  -- [FK → users.id]
  invited_at                             timestamptz,
  joined_at                              timestamptz,
  last_active_at                         timestamptz,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for organization_members:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- user_id                                uuid                 NOT NULL    FK → users.id
-- role                                   text                 NOT NULL    
-- status                                 text                 NOT NULL    
-- invited_by                             uuid                 NULLABLE    FK → users.id
-- invited_at                             timestamptz          NULLABLE    
-- joined_at                              timestamptz          NULLABLE    
-- last_active_at                         timestamptz          NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: organizations
--   Organization accounts. Each user can belong to multiple orgs.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.organizations (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  name                                   varchar NOT NULL,
  slug                                   varchar NOT NULL,
  website                                text,
  industry                               varchar,
  company_size                           varchar,
  country                                varchar,
  default_currency                       varchar NOT NULL DEFAULT USD,
  default_timezone                       varchar NOT NULL DEFAULT UTC,
  logo_url                               text,
  primary_color                          varchar,
  custom_domain                          text,
  plan_id                                uuid,
  billing_email                          varchar,
  tax_id                                 varchar,
  billing_address                        jsonb,
  stripe_customer_id                     varchar,
  is_active                              boolean NOT NULL DEFAULT true,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now(),
  user_id                                uuid,
  company_name                           text
);
*/

-- Column reference for organizations:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- name                                   varchar              NOT NULL    
-- slug                                   varchar              NOT NULL    
-- website                                text                 NULLABLE    
-- industry                               varchar              NULLABLE    
-- company_size                           varchar              NULLABLE    
-- country                                varchar              NULLABLE    
-- default_currency                       varchar              NOT NULL    
-- default_timezone                       varchar              NOT NULL    
-- logo_url                               text                 NULLABLE    
-- primary_color                          varchar              NULLABLE    
-- custom_domain                          text                 NULLABLE    
-- plan_id                                uuid                 NULLABLE    
-- billing_email                          varchar              NULLABLE    
-- tax_id                                 varchar              NULLABLE    
-- billing_address                        jsonb                NULLABLE    
-- stripe_customer_id                     varchar              NULLABLE    
-- is_active                              boolean              NOT NULL    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    
-- user_id                                uuid                 NULLABLE    
-- company_name                           text                 NULLABLE    

-- ----------------------------------------------------------------
-- TABLE: payment_methods
--   Stored payment methods. Card details tokenized via Stripe.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.payment_methods (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  type                                   text NOT NULL DEFAULT card,
  card_brand                             varchar,
  card_last_four                         varchar,
  expiry_month                           integer,
  expiry_year                            integer,
  is_default                             boolean NOT NULL DEFAULT false,
  stripe_pm_id                           varchar,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for payment_methods:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- type                                   text                 NOT NULL    
-- card_brand                             varchar              NULLABLE    
-- card_last_four                         varchar              NULLABLE    
-- expiry_month                           integer              NULLABLE    
-- expiry_year                            integer              NULLABLE    
-- is_default                             boolean              NOT NULL    
-- stripe_pm_id                           varchar              NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: plans
--   Subscription plan definitions. NULL limits = unlimited.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.plans (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  name                                   varchar NOT NULL,
  slug                                   varchar NOT NULL,
  price_monthly                          numeric NOT NULL DEFAULT 0,
  price_annual                           numeric NOT NULL DEFAULT 0,
  max_users                              integer,
  max_organizations                      integer,
  max_integrations                       integer,
  features                               jsonb NOT NULL,
  is_active                              boolean NOT NULL DEFAULT true,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for plans:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- name                                   varchar              NOT NULL    
-- slug                                   varchar              NOT NULL    
-- price_monthly                          numeric              NOT NULL    
-- price_annual                           numeric              NOT NULL    
-- max_users                              integer              NULLABLE    
-- max_organizations                      integer              NULLABLE    
-- max_integrations                       integer              NULLABLE    
-- features                               jsonb                NOT NULL    
-- is_active                              boolean              NOT NULL    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: pricing_audit_log
-- ----------------------------------------------------------------
/*
CREATE TABLE public.pricing_audit_log (
  id                                     uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  changed_by                             uuid NOT NULL,  -- [FK → users.id]
  model_pricing_id                       uuid,  -- [FK → model_pricing.id]
  provider                               text NOT NULL,
  model_name                             text NOT NULL,
  old_input_cost                         numeric,
  old_output_cost                        numeric,
  new_input_cost                         numeric,
  new_output_cost                        numeric,
  action                                 text NOT NULL,
  changed_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for pricing_audit_log:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- changed_by                             uuid                 NOT NULL    FK → users.id
-- model_pricing_id                       uuid                 NULLABLE    FK → model_pricing.id
-- provider                               text                 NOT NULL    
-- model_name                             text                 NOT NULL    
-- old_input_cost                         numeric              NULLABLE    
-- old_output_cost                        numeric              NULLABLE    
-- new_input_cost                         numeric              NULLABLE    
-- new_output_cost                        numeric              NULLABLE    
-- action                                 text                 NOT NULL    
-- changed_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: profiles
-- ----------------------------------------------------------------
/*
CREATE TABLE public.profiles (
  id                                     uuid NOT NULL,  -- [PRIMARY KEY]
  full_name                              text,
  role                                   text,
  use_case                               text,
  onboarding_completed                   boolean NOT NULL DEFAULT false,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for profiles:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- full_name                              text                 NULLABLE    
-- role                                   text                 NULLABLE    
-- use_case                               text                 NULLABLE    
-- onboarding_completed                   boolean              NOT NULL    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: reports
-- ----------------------------------------------------------------
/*
CREATE TABLE public.reports (
  id                                     uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  created_by                             uuid NOT NULL,  -- [FK → users.id]
  name                                   varchar NOT NULL,
  type                                   varchar NOT NULL,
  format                                 varchar NOT NULL,
  status                                 varchar NOT NULL DEFAULT generating,
  date_range_start                       date,
  date_range_end                         date,
  providers                              jsonb,
  teams                                  jsonb,
  recurring                              boolean DEFAULT false,
  frequency                              varchar,
  data_snapshot                          jsonb,
  error_message                          text,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for reports:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- created_by                             uuid                 NOT NULL    FK → users.id
-- name                                   varchar              NOT NULL    
-- type                                   varchar              NOT NULL    
-- format                                 varchar              NOT NULL    
-- status                                 varchar              NOT NULL    
-- date_range_start                       date                 NULLABLE    
-- date_range_end                         date                 NULLABLE    
-- providers                              jsonb                NULLABLE    
-- teams                                  jsonb                NULLABLE    
-- recurring                              boolean              NULLABLE    
-- frequency                              varchar              NULLABLE    
-- data_snapshot                          jsonb                NULLABLE    
-- error_message                          text                 NULLABLE    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: roi_settings
-- ----------------------------------------------------------------
/*
CREATE TABLE public.roi_settings (
  user_id                                uuid NOT NULL,  -- [PRIMARY KEY]
  hourly_rate                            numeric NOT NULL DEFAULT 50,
  calculation_model                      text NOT NULL DEFAULT time_saved,
  baseline_revenue                       numeric NOT NULL DEFAULT 0,
  ai_revenue                             numeric NOT NULL DEFAULT 0,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for roi_settings:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- user_id                                uuid                 NOT NULL    PRIMARY KEY
-- hourly_rate                            numeric              NOT NULL    
-- calculation_model                      text                 NOT NULL    
-- baseline_revenue                       numeric              NOT NULL    
-- ai_revenue                             numeric              NOT NULL    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: security_sessions
--   Active sessions for security page. Synced from Supabase Auth sessions.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.security_sessions (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  device_name                            varchar,
  browser                                varchar,
  os                                     varchar,
  ip_address                             inet,
  location                               varchar,
  user_agent                             text,
  is_current                             boolean NOT NULL DEFAULT false,
  last_active_at                         timestamptz NOT NULL DEFAULT now(),
  expires_at                             timestamptz NOT NULL DEFAULT (now() + '30 days'::interval),
  revoked_at                             timestamptz,
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for security_sessions:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    FK → users.id
-- device_name                            varchar              NULLABLE    
-- browser                                varchar              NULLABLE    
-- os                                     varchar              NULLABLE    
-- ip_address                             inet                 NULLABLE    
-- location                               varchar              NULLABLE    
-- user_agent                             text                 NULLABLE    
-- is_current                             boolean              NOT NULL    
-- last_active_at                         timestamptz          NOT NULL    
-- expires_at                             timestamptz          NOT NULL    
-- revoked_at                             timestamptz          NULLABLE    
-- created_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: subscriptions
--   Active subscription per organization. Linked to Stripe.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.subscriptions (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  plan_id                                uuid NOT NULL,  -- [FK → plans.id]
  status                                 text NOT NULL DEFAULT trialing,
  billing_cycle                          text NOT NULL DEFAULT monthly,
  current_period_start                   timestamptz NOT NULL DEFAULT now(),
  current_period_end                     timestamptz NOT NULL DEFAULT (now() + '30 days'::interval),
  trial_ends_at                          timestamptz DEFAULT (now() + '14 days'::interval),
  cancelled_at                           timestamptz,
  stripe_subscription_id                 varchar,
  price_override                         numeric,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for subscriptions:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- plan_id                                uuid                 NOT NULL    FK → plans.id
-- status                                 text                 NOT NULL    
-- billing_cycle                          text                 NOT NULL    
-- current_period_start                   timestamptz          NOT NULL    
-- current_period_end                     timestamptz          NOT NULL    
-- trial_ends_at                          timestamptz          NULLABLE    
-- cancelled_at                           timestamptz          NULLABLE    
-- stripe_subscription_id                 varchar              NULLABLE    
-- price_override                         numeric              NULLABLE    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: task_logs
-- ----------------------------------------------------------------
/*
CREATE TABLE public.task_logs (
  task_id                                uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,
  manual_time_minutes                    numeric NOT NULL,
  ai_time_minutes                        numeric NOT NULL,
  ai_cost_usd                            numeric NOT NULL DEFAULT 0,
  timestamp                              timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for task_logs:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- task_id                                uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    
-- manual_time_minutes                    numeric              NOT NULL    
-- ai_time_minutes                        numeric              NOT NULL    
-- ai_cost_usd                            numeric              NOT NULL    
-- timestamp                              timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: two_factor_auth
--   2FA configuration per user. TOTP secret encrypted at application level.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.two_factor_auth (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,  -- [FK → users.id]
  is_enabled                             boolean NOT NULL DEFAULT false,
  method                                 text,
  totp_secret                            varchar,
  backup_codes                           jsonb,
  backup_codes_used                      integer NOT NULL DEFAULT 0,
  verified_at                            timestamptz,
  updated_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for two_factor_auth:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    FK → users.id
-- is_enabled                             boolean              NOT NULL    
-- method                                 text                 NULLABLE    
-- totp_secret                            varchar              NULLABLE    
-- backup_codes                           jsonb                NULLABLE    
-- backup_codes_used                      integer              NOT NULL    
-- verified_at                            timestamptz          NULLABLE    
-- updated_at                             timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: usage_logs
-- ----------------------------------------------------------------
/*
CREATE TABLE public.usage_logs (
  id                                     uuid NOT NULL DEFAULT gen_random_uuid(),  -- [PRIMARY KEY]
  user_id                                uuid NOT NULL,
  team_id                                uuid,
  project_id                             text,
  model                                  text NOT NULL,  -- [FK → cost_configs.model]
  input_tokens                           integer NOT NULL DEFAULT 0,
  output_tokens                          integer NOT NULL DEFAULT 0,
  total_tokens                           integer NOT NULL DEFAULT 0,
  request_count                          integer NOT NULL DEFAULT 1,
  cost_usd                               numeric NOT NULL DEFAULT 0,
  timestamp                              timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for usage_logs:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- user_id                                uuid                 NOT NULL    
-- team_id                                uuid                 NULLABLE    
-- project_id                             text                 NULLABLE    
-- model                                  text                 NOT NULL    FK → cost_configs.model
-- input_tokens                           integer              NOT NULL    
-- output_tokens                          integer              NOT NULL    
-- total_tokens                           integer              NOT NULL    
-- request_count                          integer              NOT NULL    
-- cost_usd                               numeric              NOT NULL    
-- timestamp                              timestamptz          NOT NULL    

-- ----------------------------------------------------------------
-- TABLE: users
--   User profiles linked to Supabase Auth. Google OAuth only.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.users (
  id                                     uuid NOT NULL,  -- [PRIMARY KEY]
  email                                  varchar NOT NULL,
  full_name                              varchar NOT NULL DEFAULT ,
  avatar_url                             text,
  job_title                              varchar,
  phone_number                           varchar,
  timezone                               varchar NOT NULL DEFAULT UTC,
  language                               varchar NOT NULL DEFAULT en,
  email_verified                         boolean NOT NULL DEFAULT false,
  is_active                              boolean NOT NULL DEFAULT true,
  last_login_at                          timestamptz,
  created_at                             timestamptz NOT NULL DEFAULT now(),
  updated_at                             timestamptz NOT NULL DEFAULT now(),
  is_platform_admin                      boolean NOT NULL DEFAULT false,
  admin_role                             text
);
*/

-- Column reference for users:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- email                                  varchar              NOT NULL    
-- full_name                              varchar              NOT NULL    
-- avatar_url                             text                 NULLABLE    
-- job_title                              varchar              NULLABLE    
-- phone_number                           varchar              NULLABLE    
-- timezone                               varchar              NOT NULL    
-- language                               varchar              NOT NULL    
-- email_verified                         boolean              NOT NULL    
-- is_active                              boolean              NOT NULL    
-- last_login_at                          timestamptz          NULLABLE    
-- created_at                             timestamptz          NOT NULL    
-- updated_at                             timestamptz          NOT NULL    
-- is_platform_admin                      boolean              NOT NULL    
-- admin_role                             text                 NULLABLE    

-- ----------------------------------------------------------------
-- TABLE: webhooks
--   Outbound webhook configs. HMAC signing with secret.
-- ----------------------------------------------------------------
/*
CREATE TABLE public.webhooks (
  id                                     uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),  -- [PRIMARY KEY]
  organization_id                        uuid NOT NULL,  -- [FK → organizations.id]
  url                                    text NOT NULL,
  events                                 jsonb NOT NULL,
  secret                                 varchar NOT NULL,
  is_active                              boolean NOT NULL DEFAULT true,
  last_triggered_at                      timestamptz,
  failure_count                          integer NOT NULL DEFAULT 0,
  created_by                             uuid NOT NULL,  -- [FK → users.id]
  created_at                             timestamptz NOT NULL DEFAULT now()
);
*/

-- Column reference for webhooks:
-- Column                                 Type                 Null?       Annotation
-- -----------------------------------------------------------------------------------------------
-- id                                     uuid                 NOT NULL    PRIMARY KEY
-- organization_id                        uuid                 NOT NULL    FK → organizations.id
-- url                                    text                 NOT NULL    
-- events                                 jsonb                NOT NULL    
-- secret                                 varchar              NOT NULL    
-- is_active                              boolean              NOT NULL    
-- last_triggered_at                      timestamptz          NULLABLE    
-- failure_count                          integer              NOT NULL    
-- created_by                             uuid                 NOT NULL    FK → users.id
-- created_at                             timestamptz          NOT NULL    

-- ================================================================
-- SECTION 2: EXPOSED RPC FUNCTIONS
-- ================================================================

-- FUNCTION: get_api_usage
--   Parameters:
--     row_limit                      :: integer
--     target_user_id                 :: uuid

-- FUNCTION: user_belongs_to_org
--   Parameters:
--     p_org_id                       :: uuid
--     p_user_id                      :: uuid

-- FUNCTION: get_cost_over_time
--   Parameters:
--     days                           :: integer
--     target_user_id                 :: uuid

-- FUNCTION: get_org_spend
--   Parameters:
--     p_end                          :: timestamptz
--     p_org_id                       :: uuid
--     p_start                        :: timestamptz

-- FUNCTION: generate_org_slug
--   Parameters:
--     org_name                       :: text

-- FUNCTION: get_model_analytics
--   Parameters:
--     target_user_id                 :: uuid

-- FUNCTION: get_dashboard_overview
--   Parameters:
--     target_user_id                 :: uuid

-- FUNCTION: get_user_alerts
--   Parameters:
--     target_user_id                 :: uuid

-- ================================================================
-- SECTION 3: QUICK TABLE INDEX
-- ================================================================
--
--  1. admin_permission_catalog
--  2. admin_permissions
--  3. ai_integrations
--  4. ai_settings
--  5. alert_rules
--  6. alerts
--  7. api_keys
--  8. api_usage_logs
--  9. audit_logs
-- 10. budgets
-- 11. cost_configs
-- 12. invitations
-- 13. invoices
-- 14. login_history
-- 15. model_pricing
-- 16. notification_preferences
-- 17. onboarding_progress
-- 18. organization_members
-- 19. organizations
-- 20. payment_methods
-- 21. plans
-- 22. pricing_audit_log
-- 23. profiles
-- 24. reports
-- 25. roi_settings
-- 26. security_sessions
-- 27. subscriptions
-- 28. task_logs
-- 29. two_factor_auth
-- 30. usage_logs
-- 31. users
-- 32. webhooks
--
-- RPC Functions:
--    get_api_usage
--    user_belongs_to_org
--    get_cost_over_time
--    get_org_spend
--    generate_org_slug
--    get_model_analytics
--    get_dashboard_overview
--    get_user_alerts
-- ================================================================
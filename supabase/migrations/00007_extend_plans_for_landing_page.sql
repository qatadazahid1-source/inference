-- ================================================================
-- EXTEND plans TABLE: add display columns for landing page pricing
-- ================================================================
-- The plans table already holds Lemon Squeezy variant IDs and price
-- columns. These new columns add the display metadata the landing page
-- needs so an admin can edit plans without a code deploy.

ALTER TABLE public.plans
  ADD COLUMN IF NOT EXISTS tagline         text             DEFAULT '',
  ADD COLUMN IF NOT EXISTS is_popular      boolean          DEFAULT false,
  ADD COLUMN IF NOT EXISTS cta_text        text             DEFAULT 'Start Free Trial',
  ADD COLUMN IF NOT EXISTS cta_variant     text             DEFAULT 'ghost',
  ADD COLUMN IF NOT EXISTS sort_order      integer          DEFAULT 0,
  ADD COLUMN IF NOT EXISTS display_features jsonb           DEFAULT '[]'::jsonb;

-- display_features stores the feature list for the plan card as a JSONB
-- array of objects: [{ "text": "5 AI integrations", "included": true }, ...]
-- Keeping it as JSONB avoids a separate join table and lets the admin
-- edit features freely without a schema change.

-- Backfill existing plans with reasonable defaults from the hardcoded
-- landing page data so they render correctly right away.
UPDATE public.plans SET
  tagline          = 'Perfect for small teams',
  is_popular       = false,
  cta_text         = 'Start Free Trial',
  cta_variant      = 'ghost',
  sort_order       = 1,
  display_features = '[
    {"text":"1 organization","included":true},
    {"text":"3 team members","included":true},
    {"text":"5 AI integrations","included":true},
    {"text":"Basic analytics","included":true},
    {"text":"Email reports","included":true},
    {"text":"Custom reports","included":false},
    {"text":"API access","included":false}
  ]'::jsonb
WHERE slug = 'starter';

UPDATE public.plans SET
  tagline          = 'For growing teams',
  is_popular       = true,
  cta_text         = 'Start Free Trial',
  cta_variant      = 'primary',
  sort_order       = 2,
  display_features = '[
    {"text":"1 organization","included":true},
    {"text":"15 team members","included":true},
    {"text":"Unlimited integrations","included":true},
    {"text":"Custom reports","included":true},
    {"text":"API access","included":true},
    {"text":"Slack & Teams alerts","included":true},
    {"text":"ROI calculator","included":true}
  ]'::jsonb
WHERE slug = 'professional';

UPDATE public.plans SET
  tagline          = 'Scale with confidence',
  is_popular       = false,
  cta_text         = 'Start Free Trial',
  cta_variant      = 'ghost',
  sort_order       = 3,
  display_features = '[
    {"text":"3 organizations","included":true},
    {"text":"50 team members","included":true},
    {"text":"Everything in Pro","included":true},
    {"text":"White-label reports","included":true},
    {"text":"SSO / SAML","included":true},
    {"text":"Priority support","included":true}
  ]'::jsonb
WHERE slug = 'business';

UPDATE public.plans SET
  tagline          = 'For large organizations',
  is_popular       = false,
  cta_text         = 'Contact Sales',
  cta_variant      = 'enterprise',
  sort_order       = 4,
  display_features = '[
    {"text":"Unlimited everything","included":true},
    {"text":"Data residency","included":true},
    {"text":"Dedicated CSM","included":true},
    {"text":"Custom SLA","included":true},
    {"text":"On-prem option","included":true},
    {"text":"HIPAA ready","included":true}
  ]'::jsonb
WHERE slug = 'enterprise';

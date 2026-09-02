-- ================================================================
-- SWITCH PAYMENT PROVIDER: Stripe → Lemon Squeezy
-- ================================================================
-- Renaming (not dropping+adding) so existing data, if any test rows
-- exist, isn't lost — a rename just changes what the column is called.

ALTER TABLE public.organizations
  RENAME COLUMN stripe_customer_id TO lemonsqueezy_customer_id;

ALTER TABLE public.subscriptions
  RENAME COLUMN stripe_subscription_id TO lemonsqueezy_subscription_id;

ALTER TABLE public.invoices
  RENAME COLUMN stripe_invoice_id TO lemonsqueezy_order_id;

-- Lemon Squeezy doesn't have a separate reusable "payment method" object
-- like Stripe — card details come attached to each subscription via
-- webhook payload. Repurposing this column to hold the Lemon Squeezy
-- subscription ID that the card info was captured from.
ALTER TABLE public.payment_methods
  RENAME COLUMN stripe_pm_id TO lemonsqueezy_subscription_id;

-- Lemon Squeezy has no dynamic price_data like Stripe — products and
-- variants (= your plan + billing cycle combinations) must be created
-- ahead of time in the Lemon Squeezy dashboard, and their variant IDs
-- stored here. NULL until you fill them in (see setup guide).
ALTER TABLE public.plans
  ADD COLUMN lemonsqueezy_variant_id_monthly text,
  ADD COLUMN lemonsqueezy_variant_id_annual text;

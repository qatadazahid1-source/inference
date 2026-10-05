-- ============================================================================
-- Migration 00018: Slack OAuth Support (Bot Tokens)
-- ============================================================================

-- Rename the old webhook_url_enc to bot_token_enc to reflect the new architecture.
-- We keep the encrypted column concept but change its purpose.
ALTER TABLE public.slack_integrations RENAME COLUMN webhook_url_enc TO bot_token_enc;

-- Add fields for the Slack OAuth workspace and channel selection.
ALTER TABLE public.slack_integrations ADD COLUMN IF NOT EXISTS team_id text;
ALTER TABLE public.slack_integrations ADD COLUMN IF NOT EXISTS channel_id text;

ALTER TABLE public.slack_integrations ALTER COLUMN bot_token_enc DROP NOT NULL;

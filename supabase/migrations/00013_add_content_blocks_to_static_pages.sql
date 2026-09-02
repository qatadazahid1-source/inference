-- ================================================================
-- EXTEND static_pages TABLE: add structured content_blocks column
-- ================================================================
-- Supports SEO-07..SEO-11 (CMS-driven marketing pages). The new
-- MarketingPage renderer (src/pages/MarketingPage.tsx) and the tabbed
-- Admin editor (src/pages/admin/pages/AdminPages.tsx) read/write this
-- single JSONB column to store structured, section-based page content
-- (hero, feature sections, FAQs, CTAs, security sections, pricing
-- marketing copy, etc.) for the pages served at /features, /pricing,
-- and /security. Plain-markdown CMS pages served at "/:slug" continue to
-- use the existing "content" column and are unaffected.
--
-- The frontend reads content_blocks via /api/public/pages/:slug and the
-- Admin writes it via /api/admin/pages. Until this migration is applied
-- the column is simply absent/undefined and the renderers fall back to
-- empty/default sections — fully backward compatible.
--
-- ⚠️ DO NOT AUTO-EXECUTE. This file is provided for review only. Apply it
--    through your normal Supabase migration workflow (e.g. `supabase db push`
--    or the migrations pipeline) after review.
--
-- Security note: this is an additive, nullable content column on an existing
-- CMS table. It introduces NO new secrets and NO new public write paths — the
-- table's existing RLS (published-only public read; admin-only write) continues
-- to govern access unchanged.

ALTER TABLE public.static_pages
  ADD COLUMN IF NOT EXISTS content_blocks jsonb DEFAULT NULL;

COMMENT ON COLUMN public.static_pages.content_blocks IS
  'Optional structured, section-based page content (JSONB) for CMS-driven marketing pages (SEO-07..SEO-11): hero, feature/section lists, FAQs, CTAs, etc. NULL = no structured content (renderer falls back to markdown "content" / defaults).';

-- ================================================================
-- EXTEND static_pages TABLE: add reusable SEO metadata columns
-- ================================================================
-- Supports SEO-02 (reusable metadata system) and SEO-05 (canonical URL)
-- for CMS-managed public pages served at the "/:slug" route
-- (src/pages/StaticPage.tsx). The frontend <Seo /> component already reads
-- these fields via /api/public/pages/:slug; until this migration is applied
-- they are simply undefined and the global fallbacks in src/config/seo.ts
-- take over. No component changes are required once these exist.
--
-- ⚠️ DO NOT AUTO-EXECUTE. This file is provided for review only. Apply it
--    through your normal Supabase migration workflow (e.g. `supabase db push`
--    or the migrations pipeline) after review.
--
-- Security note: these are additive, nullable content columns on an existing
-- CMS table. They introduce NO new secrets and NO new public write paths — the
-- table's existing RLS (published-only public read; admin-only write) continues
-- to govern access unchanged.

ALTER TABLE public.static_pages
  ADD COLUMN IF NOT EXISTS meta_keywords text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS canonical_url text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS og_image      text        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS robots        text        DEFAULT NULL;

COMMENT ON COLUMN public.static_pages.meta_keywords IS
  'Optional comma-separated meta keywords for this page (SEO-02). NULL = omit tag.';
COMMENT ON COLUMN public.static_pages.canonical_url IS
  'Optional explicit canonical URL override (SEO-05). NULL = derive from route path.';
COMMENT ON COLUMN public.static_pages.og_image IS
  'Optional Open Graph / Twitter share image (absolute or root-relative URL). NULL = site default.';
COMMENT ON COLUMN public.static_pages.robots IS
  'Optional robots directive override, e.g. "noindex,follow". NULL = "index,follow".';

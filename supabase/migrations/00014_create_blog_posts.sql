-- ================================================================
-- CREATE blog_posts TABLE: dedicated CMS-managed blog storage
-- ================================================================
-- Supports SEO-17..SEO-19 (CMS-driven blog). Backs the public routes
-- /blog (listing) and /blog/:slug (article) served by the frontend
-- (src/pages/BlogList.tsx, src/pages/BlogPost.tsx) via the public API
-- (GET /api/public/blog, GET /api/public/blog/:slug), and the Admin
-- editor (src/pages/admin/blog/AdminBlog.tsx) via /api/admin/blog.
--
-- This is a NEW, standalone table — it does NOT reuse static_pages and
-- does NOT modify any historical migration. Fully additive.
--
-- ⚠️ DO NOT AUTO-EXECUTE. This file is provided for review only. Apply it
--    through your normal Supabase migration workflow (e.g. `supabase db push`
--    or the migrations pipeline) after review.
--
-- Security: RLS mirrors static_pages — public may read ONLY published rows;
-- all writes are restricted to the service role (the backend admin API runs
-- with the service key behind the requirePlatformAdmin gate). No new public
-- write path is introduced.

-- ── Table ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.blog_posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug            text NOT NULL UNIQUE,
  title           text NOT NULL,
  excerpt         text,
  body            text,                       -- markdown article body
  author          text,
  category        text,
  tags            text[]      DEFAULT '{}',   -- free-form tag list
  featured_image  text,
  meta_title      text,
  meta_description text,
  meta_keywords   text,
  canonical_url   text,
  og_image        text,
  robots          text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'published')),
  published_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.blog_posts IS
  'CMS-managed blog articles (SEO-17..SEO-19). Public reads published rows via /api/public/blog[/:slug]; admin writes via /api/admin/blog. Body is markdown, rendered with react-markdown.';

-- ── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS blog_posts_status_idx        ON public.blog_posts (status);
CREATE INDEX IF NOT EXISTS blog_posts_published_at_idx  ON public.blog_posts (published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_category_idx      ON public.blog_posts (category);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- Reuses the shared set_updated_at() if present; defines a local one otherwise.
CREATE OR REPLACE FUNCTION public.blog_posts_set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS blog_posts_updated_at ON public.blog_posts;
CREATE TRIGGER blog_posts_updated_at
  BEFORE UPDATE ON public.blog_posts
  FOR EACH ROW EXECUTE FUNCTION public.blog_posts_set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────────────────────
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) may read ONLY published articles.
DROP POLICY IF EXISTS "blog_posts public read published" ON public.blog_posts;
CREATE POLICY "blog_posts public read published"
  ON public.blog_posts
  FOR SELECT
  USING (status = 'published');

-- Writes are performed by the backend using the service role, which bypasses
-- RLS. No INSERT/UPDATE/DELETE policy is granted to anon/authenticated, so the
-- only write path is the admin API behind requirePlatformAdmin.

import express from 'express';
import { supabase } from '../index.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// â”€â”€â”€ GET /api/public/site-links â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unauthenticated â€” read by the landing page footer. Only returns active
// links, grouped by section, ordered for display.
router.get('/site-links', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('site_links')
      .select('id, section, label, url, sort_order')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    const grouped = { product: [], company: [], legal: [], social: [] };
    for (const link of data || []) {
      if (grouped[link.section]) grouped[link.section].push(link);
    }

    res.json({ data: grouped });
  } catch (err) {
    console.error('[public] GET /site-links error:', err.message);
    // Fail soft â€” footer should render with no links rather than break
    // the whole landing page if this table has an issue.
    res.json({ data: { product: [], company: [], legal: [], social: [] } });
  }
});

// â”€â”€â”€ GET /api/public/pricing-plans â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unauthenticated â€” read by the landing page PricingSection.
// Returns all active plans with their display columns, ordered by sort_order.
// Fails soft (empty array) so the landing page always renders.
router.get('/pricing-plans', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('plans')
      .select(
        'id, name, slug, price_monthly, price_annual, tagline, is_popular, cta_text, cta_variant, sort_order, display_features, lemonsqueezy_variant_id_monthly, lemonsqueezy_variant_id_annual'
      )
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[public] GET /pricing-plans error:', err.message);
    res.json({ data: [] });
  }
});

// â”€â”€â”€ GET /api/public/pages/:slug â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unauthenticated â€” read by the generic StaticPage component (About, Privacy
// Policy, Terms, etc.). Returns 404 if the slug doesn't exist or isn't
// published â€” RLS also enforces the published-only rule, this check just
// gives a clean 404 instead of an empty-row 500.
router.get('/pages/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('static_pages')
      .select(
        'slug, title, content, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, content_blocks, updated_at'
      )
      .eq('slug', slug)
      .eq('is_published', true)
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Page not found' });

    res.json({ data });
  } catch (err) {
    console.error('[public] GET /pages/:slug error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ GET /api/public/blog â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unauthenticated â€” read by the public blog listing page. Returns ONLY
// published posts, newest first (by published_at, falling back to created_at).
// RLS also enforces the published-only rule; the status filter here keeps the
// contract explicit and lets us order/trim columns for the list view.
router.get('/blog', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'slug, title, excerpt, author, category, tags, featured_image, published_at'
      )
      .eq('status', 'published')
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (err) {
    console.error('[public] GET /blog error:', err.message);
    // Fail soft â€” the blog index should render an empty state rather than 500.
    res.json({ data: [] });
  }
});

// â”€â”€â”€ GET /api/public/blog/:slug â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unauthenticated â€” read by the blog article page. Returns the full published
// post (including SEO fields and markdown body). 404 for missing/draft slugs.
router.get('/blog/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('blog_posts')
      .select(
        'slug, title, excerpt, body, author, category, tags, featured_image, meta_title, meta_description, meta_keywords, canonical_url, og_image, robots, published_at, updated_at'
      )
      .eq('slug', slug)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Post not found' });

    res.json({ data });
  } catch (err) {
    console.error('[public] GET /blog/:slug error:', err.message);
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
});

// â”€â”€â”€ GET /api/public/sitemap.xml â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Unauthenticated â€” dynamically generated sitemap. Combines a fixed baseline of
// hand-maintained public routes (marketing + docs) with CMS-managed content:
//   â€¢ published `static_pages` (generic /:slug, /alternatives/:slug via the
//     "alternatives-" prefix, /use-cases/:slug via the "use-cases-" prefix)
//   â€¢ published `blog_posts` â†’ /blog/:slug
// Drafts, noindex pages, and all private / admin / auth routes are excluded.
// URLs are de-duplicated and built from SITE_URL (env, trailing slash stripped).
// Fails soft: on any error it still returns the fixed baseline so crawlers never
// hit a 500.
const SITEMAP_SITE_URL = (
  process.env.VITE_SITE_URL ||
  process.env.SITE_URL ||
  'https://app.ordisum.com'
).replace(/\/+$/, '');

// Fixed, hand-maintained public routes that always belong in the sitemap.
// Kept in sync with the static baseline in public/sitemap.xml.
const SITEMAP_FIXED_ROUTES = [
  { path: '/', changefreq: 'weekly', priority: '1.0' },
  { path: '/features', changefreq: 'weekly', priority: '0.9' },
  { path: '/pricing', changefreq: 'weekly', priority: '0.9' },
  { path: '/security', changefreq: 'monthly', priority: '0.8' },
  { path: '/contact-sales', changefreq: 'monthly', priority: '0.8' },
  { path: '/blog', changefreq: 'weekly', priority: '0.8' },
  { path: '/docs/overview', changefreq: 'monthly', priority: '0.7' },
  { path: '/docs/quickstart', changefreq: 'monthly', priority: '0.7' },
  { path: '/docs/providers', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/changelog', changefreq: 'weekly', priority: '0.6' },
  { path: '/docs/dashboard', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/budget-alerts', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/roi-calculator', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/teams', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/api-auth', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/api-endpoints', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/faq', changefreq: 'monthly', priority: '0.6' },
  { path: '/docs/troubleshooting', changefreq: 'monthly', priority: '0.6' },
];

// A robots value counts as indexable unless it contains "noindex".
function sitemapIsIndexable(robots) {
  return !/noindex/i.test(String(robots || ''));
}

// Map a stored static_pages slug to its public route path.
//   "alternatives-helicone"        â†’ "/alternatives/helicone"
//   "use-cases-ai-cost-monitoring" â†’ "/use-cases/ai-cost-monitoring"
//   "about-us"                     â†’ "/about-us"
function sitemapStaticPagePath(slug) {
  if (slug.startsWith('alternatives-')) {
    return `/alternatives/${slug.slice('alternatives-'.length)}`;
  }
  if (slug.startsWith('use-cases-')) {
    return `/use-cases/${slug.slice('use-cases-'.length)}`;
  }
  return `/${slug}`;
}

// Escape the five XML special characters for safe <loc> output.
function sitemapXmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Render an array of { path, changefreq?, priority?, lastmod? } into a full
// sitemap XML document.
function sitemapRender(entries) {
  const seen = new Set();
  const urls = [];
  for (const entry of entries) {
    if (!entry || !entry.path) continue;
    const path = entry.path;
    if (seen.has(path)) continue;
    seen.add(path);

    const loc = sitemapXmlEscape(`${SITEMAP_SITE_URL}${path}`);
    let block = `  <url>\n    <loc>${loc}</loc>\n`;
    if (entry.lastmod) block += `    <lastmod>${sitemapXmlEscape(entry.lastmod)}</lastmod>\n`;
    if (entry.changefreq) block += `    <changefreq>${entry.changefreq}</changefreq>\n`;
    if (entry.priority) block += `    <priority>${entry.priority}</priority>\n`;
    block += '  </url>';
    urls.push(block);
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.join('\n') +
    '\n</urlset>\n'
  );
}

router.get('/sitemap.xml', async (req, res) => {
  try {
    // Fetch published, indexable CMS pages and blog posts in parallel.
    const [pagesResult, postsResult] = await Promise.all([
      supabase
        .from('static_pages')
        .select('slug, robots, updated_at')
        .eq('is_published', true),
      supabase
        .from('blog_posts')
        .select('slug, robots, published_at, updated_at')
        .eq('status', 'published'),
    ]);

    if (pagesResult.error) throw pagesResult.error;
    if (postsResult.error) throw postsResult.error;

    const entries = [...SITEMAP_FIXED_ROUTES];

    for (const page of pagesResult.data || []) {
      if (!page.slug || !sitemapIsIndexable(page.robots)) continue;
      entries.push({
        path: sitemapStaticPagePath(page.slug),
        changefreq: 'weekly',
        priority: '0.7',
        lastmod: page.updated_at || undefined,
      });
    }

    for (const post of postsResult.data || []) {
      if (!post.slug || !sitemapIsIndexable(post.robots)) continue;
      entries.push({
        path: `/blog/${post.slug}`,
        changefreq: 'monthly',
        priority: '0.6',
        lastmod: post.updated_at || post.published_at || undefined,
      });
    }

    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(sitemapRender(entries));
  } catch (err) {
    console.error('[public] GET /sitemap.xml error:', err.message);
    // Fail soft â€” still serve the fixed baseline so crawlers never see a 500.
    res.set('Content-Type', 'application/xml; charset=utf-8');
    res.send(sitemapRender(SITEMAP_FIXED_ROUTES));
  }
});

// ————————————————————————————————————————————————————————————————————————————
// Unauthenticated — accepts contact sales submissions and saves to sales_leads.
const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many contact requests from this IP, please try again after an hour.' }
});

router.post('/contact', contactLimiter, async (req, res) => {
  try {
    const { first_name, last_name, email, company, employees, message } = req.body;

    if (!first_name || !last_name || !email || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const { error } = await supabase
      .from('sales_leads')
      .insert({
        first_name,
        last_name,
        email,
        company,
        employees,
        message
      });

    if (error) throw error;

    res.json({ success: true });
  } catch (err) {
    console.error('[public] POST /contact error:', err.message);
    res.status(500).json({ error: 'Failed to submit contact form' });
  }
});

export default router;


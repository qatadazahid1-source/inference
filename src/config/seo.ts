/**
 * Central SEO configuration — single source of truth for the reusable
 * metadata system (SEO-02) and the canonical URL mechanism (SEO-05).
 *
 * There is intentionally NO second copy of these values anywhere else.
 * Components/hooks read from here so behaviour stays consistent and any
 * future change (domain, default title, default social image) is made in
 * exactly one place.
 *
 * ── DOMAIN (configuration item) ──────────────────────────────────────────────
 * The production canonical origin is read from the `VITE_SITE_URL` build-time
 * env var. If it is not set we fall back to `app.ordisum.com`
 * (the only domain referenced anywhere in this codebase — see
 * backend/src/utils/sendAlertEmail.js). That subdomain is the *application*
 * host and is very likely NOT the public marketing/canonical domain.
 *
 * ⚠️ ACTION REQUIRED before go-live: set `VITE_SITE_URL` to the real public
 * marketing domain (e.g. https://www.ordisum.com) so that
 * canonical tags, Open Graph URLs, robots.txt and sitemap.xml all point at the
 * correct host. This value was deliberately NOT invented.
 */

const RAW_SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ||
  'https://ordisum.com';

/** Production origin with any trailing slash stripped (e.g. https://example.com). */
export const SITE_URL = RAW_SITE_URL.replace(/\/+$/, '');

/** Human-readable brand name used for og:site_name and title composition. */
export const SITE_NAME = 'Ordisum';

/** Global fallback title used when a page supplies none. */
export const DEFAULT_TITLE = 'Ordisum — Intelligence in Order';

/** Global fallback meta description. */
export const DEFAULT_DESCRIPTION =
  'Real-time observability for your AI API spend — across every provider, every model, every team.';

/**
 * Default social share image (Open Graph / Twitter). Optional.
 * Read from `VITE_DEFAULT_OG_IMAGE`; if unset, no default image tag is emitted
 * (we do not reference an asset that may not exist). A CMS page can still
 * supply its own image per-page.
 *
 * ⚠️ Recommended manual step: add a 1200×630 share image to `public/` and set
 * `VITE_DEFAULT_OG_IMAGE` (absolute or root-relative URL).
 */
export const DEFAULT_OG_IMAGE =
  (import.meta.env.VITE_DEFAULT_OG_IMAGE as string | undefined) || '';

/** Default Twitter card style for public pages. */
export const DEFAULT_TWITTER_CARD = 'summary_large_image';

/**
 * Resolve any image reference to an absolute URL. Root-relative paths are
 * prefixed with SITE_URL; already-absolute URLs are returned unchanged.
 */
export function absoluteUrl(pathOrUrl?: string | null): string | undefined {
  const value = pathOrUrl?.trim();
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `${SITE_URL}/${value.replace(/^\/+/, '')}`;
}

/**
 * Build a normalized canonical URL from a pathname (SEO-05).
 *
 * Rules:
 *  - always uses the production HTTPS origin (SITE_URL)
 *  - collapses duplicate slashes
 *  - strips trailing slashes (except the root "/")
 *  - drops query strings and hash fragments (canonical points at the clean page)
 */
export function buildCanonicalUrl(pathname?: string | null): string {
  let path = (pathname || '/').split('#')[0].split('?')[0];
  if (!path.startsWith('/')) path = `/${path}`;
  path = path.replace(/\/{2,}/g, '/');
  if (path.length > 1) path = path.replace(/\/+$/, '');
  return `${SITE_URL}${path}`;
}

/**
 * Resolve a canonical URL from either an explicit CMS-supplied override or the
 * current route pathname (SEO-05).
 *
 * - If `override` is an absolute URL, its pathname is normalized onto SITE_URL
 *   (so canonicals always use the production origin, never a stray host).
 * - If `override` is a path, it is normalized directly.
 * - If `override` is empty, the current `pathname` is used.
 */
export function resolveCanonical(
  override: string | null | undefined,
  pathname: string
): string {
  const value = override?.trim();
  if (!value) return buildCanonicalUrl(pathname);
  if (/^https?:\/\//i.test(value)) {
    try {
      return buildCanonicalUrl(new URL(value).pathname);
    } catch {
      return buildCanonicalUrl(pathname);
    }
  }
  return buildCanonicalUrl(value);
}

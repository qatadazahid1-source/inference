import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  SITE_NAME,
  DEFAULT_TITLE,
  DEFAULT_DESCRIPTION,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER_CARD,
  absoluteUrl,
  resolveCanonical,
} from '../config/seo';

/**
 * Reusable, CMS-ready SEO metadata system for PUBLIC pages (SEO-02 + SEO-05).
 *
 * This is the single component every public route uses to control its search
 * and social metadata. It manages, at runtime (this is a client-rendered Vite
 * SPA with no server render), the following <head> tags:
 *   - document.title
 *   - <meta name="description">
 *   - <meta name="keywords">           (only when provided)
 *   - <meta name="robots">             (defaults to index,follow for public)
 *   - <link rel="canonical">           (SEO-05)
 *   - Open Graph:  og:title, og:description, og:type, og:url, og:site_name, og:image
 *   - Twitter:     twitter:card, twitter:title, twitter:description, twitter:image
 *   - JSON-LD:     <script type="application/ld+json"> structured data (SEO-07..11)
 *
 * ── FALLBACK HIERARCHY ───────────────────────────────────────────────────────
 * For every field the resolution order is:
 *   1. CMS/prop value passed in (future Admin-managed content flows in here)
 *   2. page-specific fallback the caller may pass
 *   3. global site default (from src/config/seo.ts)
 *
 * ── CMS READINESS ────────────────────────────────────────────────────────────
 * A CMS page fetched from /api/public/pages/:slug simply spreads its fields
 * into <Seo .../>. When the static_pages table is extended with canonical /
 * og / twitter / keywords / robots columns (see the provided migration), those
 * values flow straight through with zero component changes.
 *
 * IMPORTANT: This component is for PUBLIC, indexable pages only. Private areas
 * (dashboard, settings, admin, auth, onboarding) must NOT render it — they get
 * a global noindex via <PrivateNoIndex /> instead.
 */
export interface SeoProps {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  /** Robots directive. Defaults to "index,follow" for public pages. */
  robots?: string | null;
  /**
   * Explicit canonical URL override (e.g. a CMS-supplied canonical). When
   * omitted the canonical is derived from the current route pathname.
   */
  canonical?: string | null;
  /** Open Graph type — "website" for the homepage, "article" for content pages. */
  ogType?: string | null;
  /** Social share image (absolute or root-relative). Falls back to site default. */
  image?: string | null;
  /** Twitter card style. Falls back to summary_large_image. */
  twitterCard?: string | null;
  /**
   * Structured data (schema.org JSON-LD) to inject as
   * <script type="application/ld+json"> tags. Accepts a single schema object
   * or an array of them (e.g. Organization + SoftwareApplication + FAQPage).
   * Null/undefined/empty emits nothing. Managed and cleaned up alongside the
   * other metadata so navigating away removes the page's structured data.
   */
  jsonLd?: Record<string, any> | Array<Record<string, any>> | null;
}

/** Upsert a <meta> tag keyed by name/property. Returns a restore callback. */
function upsertMeta(
  attr: 'name' | 'property',
  key: string,
  content: string | undefined
): () => void {
  const selector = `meta[${attr}="${key}"]`;
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  const existed = !!el;
  const prev = el?.getAttribute('content') ?? null;

  if (content === undefined) {
    // Nothing to set. If a tag exists leave it; otherwise no-op.
    return () => { };
  }

  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);

  return () => {
    if (!el) return;
    if (existed) {
      if (prev !== null) el.setAttribute('content', prev);
    } else {
      el.remove();
    }
  };
}

/** Upsert the <link rel="canonical"> tag. Returns a restore callback. */
function upsertCanonical(href: string | undefined): () => void {
  const selector = 'link[rel="canonical"]';
  let el = document.head.querySelector<HTMLLinkElement>(selector);
  const existed = !!el;
  const prev = el?.getAttribute('href') ?? null;

  if (href === undefined) return () => { };

  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', 'canonical');
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);

  return () => {
    if (!el) return;
    if (existed) {
      if (prev !== null) el.setAttribute('href', prev);
    } else {
      el.remove();
    }
  };
}

/**
 * Remove any existing <link rel="canonical"> tag. Returns a restore callback
 * that re-adds it on unmount. Used for private/noindex pages (SEO-05) so a
 * canonical inherited from a previously-rendered public page never lingers.
 */
function removeCanonical(): () => void {
  const el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!el) return () => { };
  const prevHref = el.getAttribute('href');
  el.remove();
  return () => {
    const restored = document.createElement('link');
    restored.setAttribute('rel', 'canonical');
    if (prevHref !== null) restored.setAttribute('href', prevHref);
    document.head.appendChild(restored);
  };
}

/** Marks JSON-LD <script> tags this hook manages so we only ever touch our own. */
const JSONLD_MARK = 'data-seo-jsonld';

/**
 * Inject one or more schema.org JSON-LD <script> tags. Returns a restore
 * callback that removes exactly the tags this call created, so navigating
 * between public pages never leaves stale structured data behind.
 */
function upsertJsonLd(
  schema: Record<string, any> | Array<Record<string, any>> | null | undefined
): () => void {
  if (schema === undefined || schema === null) return () => { };

  const items = (Array.isArray(schema) ? schema : [schema]).filter(
    (s) => s && typeof s === 'object' && Object.keys(s).length > 0
  );
  if (items.length === 0) return () => { };

  const created: HTMLScriptElement[] = [];
  for (const item of items) {
    let serialized: string;
    try {
      serialized = JSON.stringify(item);
    } catch {
      // Skip anything that can't be serialized (e.g. circular refs) rather
      // than throwing inside a render effect.
      continue;
    }
    const el = document.createElement('script');
    el.setAttribute('type', 'application/ld+json');
    el.setAttribute(JSONLD_MARK, 'true');
    el.textContent = serialized;
    document.head.appendChild(el);
    created.push(el);
  }

  return () => {
    for (const el of created) el.remove();
  };
}

export function useSeo(props: SeoProps): void {
  const { pathname } = useLocation();
  const {
    title,
    description,
    keywords,
    robots,
    canonical,
    ogType,
    image,
    twitterCard,
    jsonLd,
  } = props;

  // Stable dependency for the effect: JSON-LD is an object/array, so we key the
  // effect on its serialized form to avoid re-running on referentially-new but
  // structurally-identical values.
  const jsonLdKey = jsonLd == null ? '' : JSON.stringify(jsonLd);

  useEffect(() => {
    const resolvedTitle = title?.trim() || DEFAULT_TITLE;
    const resolvedDescription = description?.trim() || DEFAULT_DESCRIPTION;
    const resolvedRobots = robots?.trim() || 'index,follow';
    const resolvedImage = absoluteUrl(image) || absoluteUrl(DEFAULT_OG_IMAGE);
    const resolvedOgType = ogType?.trim() || 'website';
    const resolvedTwitterCard = twitterCard?.trim() || DEFAULT_TWITTER_CARD;

    // SEO-05: private / non-indexable pages must NOT advertise a canonical URL.
    // When the page is marked noindex we neither emit <link rel="canonical">
    // nor og:url, and we actively remove any canonical inherited from a
    // previously-rendered public page.
    const isIndexable = !/noindex/i.test(resolvedRobots);
    const resolvedCanonical = isIndexable
      ? resolveCanonical(canonical, pathname)
      : undefined;

    const prevTitle = document.title;
    document.title = resolvedTitle;

    const restores: Array<() => void> = [
      upsertMeta('name', 'description', resolvedDescription),
      upsertMeta('name', 'robots', resolvedRobots),
      upsertMeta('name', 'keywords', keywords?.trim() || undefined),
      // Open Graph
      upsertMeta('property', 'og:title', resolvedTitle),
      upsertMeta('property', 'og:description', resolvedDescription),
      upsertMeta('property', 'og:type', resolvedOgType),
      upsertMeta('property', 'og:url', resolvedCanonical),
      upsertMeta('property', 'og:site_name', SITE_NAME),
      upsertMeta('property', 'og:image', resolvedImage),
      // Twitter
      upsertMeta('name', 'twitter:card', resolvedTwitterCard),
      upsertMeta('name', 'twitter:title', resolvedTitle),
      upsertMeta('name', 'twitter:description', resolvedDescription),
      upsertMeta('name', 'twitter:image', resolvedImage),
      // Canonical (SEO-05) — only for indexable pages.
      isIndexable
        ? upsertCanonical(resolvedCanonical)
        : removeCanonical(),
      // Structured data (JSON-LD) — only advertised on indexable pages.
      isIndexable ? upsertJsonLd(jsonLd) : (() => { }),
    ];

    return () => {
      document.title = prevTitle;
      // Restore in reverse order.
      for (let i = restores.length - 1; i >= 0; i--) restores[i]();
    };
  }, [
    title,
    description,
    keywords,
    robots,
    canonical,
    ogType,
    image,
    twitterCard,
    jsonLdKey,
    pathname,
  ]);
}

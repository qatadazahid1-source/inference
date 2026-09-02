/**
 * Shared JSON-LD schema core (SEO-20).
 *
 * ── Purpose ──────────────────────────────────────────────────────────────────
 * A SINGLE reusable builder for schema.org structured data expressed as a
 * connected `@graph`. Every public page composes its structured data from these
 * helpers so that:
 *   - entities share stable `@id`s and cross-reference each other,
 *   - there is exactly ONE Organization / WebSite identity across the site,
 *   - no page hand-rolls a parallel/duplicate schema system.
 *
 * ── Truthfulness rule (non-negotiable) ───────────────────────────────────────
 * These builders NEVER fabricate data. They only emit fields they are given.
 * Do NOT add ratings, reviews, prices, offers, authors, awards, social profiles,
 * customer counts, or product claims unless the caller passes real, verified
 * values sourced from the CMS/content.
 *
 * ── Identity / @id conventions ───────────────────────────────────────────────
 *   Organization   → `${SITE_URL}/#organization`
 *   WebSite        → `${SITE_URL}/#website`
 *   WebPage        → `${canonical}#webpage`
 *   BreadcrumbList → `${canonical}#breadcrumb`
 * WebPage.isPartOf → WebSite; WebPage.about/publisher → Organization.
 *
 * ── Search ───────────────────────────────────────────────────────────────────
 * The site has NO public on-site search endpoint, so WebSite intentionally does
 * NOT advertise a `SearchAction`. If a real search route is added later, pass a
 * `searchUrlTemplate` to {@link buildWebSite} to enable it — never invent one.
 */

import {
    SITE_URL,
    SITE_NAME,
    DEFAULT_DESCRIPTION,
    absoluteUrl,
} from '../config/seo';

/** Loose JSON-LD node type — schema.org nodes are open-shaped by design. */
export type JsonLdNode = Record<string, any>;

/** Stable @id for the single site-wide Organization entity. */
export const ORG_ID = `${SITE_URL}/#organization`;
/** Stable @id for the single site-wide WebSite entity. */
export const WEBSITE_ID = `${SITE_URL}/#website`;

/** A single breadcrumb entry (already resolved to an absolute URL). */
export interface BreadcrumbItem {
    /** Human-readable label for the crumb. */
    name: string;
    /** Absolute URL the crumb points at. */
    item: string;
}

/**
 * Build the site-wide Organization node.
 *
 * Only truthful, always-available fields are emitted by default (name, url,
 * description). Optional `logo` / `sameAs` are included ONLY when the caller
 * supplies real values.
 */
export function buildOrganization(opts?: {
    description?: string | null;
    /** Absolute or root-relative logo URL (resolved via absoluteUrl). */
    logo?: string | null;
    /** Real, verified social/profile URLs. Empty/omitted → no sameAs emitted. */
    sameAs?: string[] | null;
}): JsonLdNode {
    const node: JsonLdNode = {
        '@type': 'Organization',
        '@id': ORG_ID,
        name: SITE_NAME,
        url: SITE_URL,
        description: (opts?.description || DEFAULT_DESCRIPTION).trim(),
    };

    const logo = absoluteUrl(opts?.logo || undefined);
    if (logo) {
        node.logo = {
            '@type': 'ImageObject',
            url: logo,
        };
    }

    const sameAs = (opts?.sameAs || [])
        .map((s) => s?.trim())
        .filter((s): s is string => !!s);
    if (sameAs.length > 0) node.sameAs = sameAs;

    return node;
}

/**
 * Build the site-wide WebSite node.
 *
 * A `SearchAction` is emitted ONLY when a real `searchUrlTemplate` is provided
 * (containing the required `{search_term_string}` placeholder). The site has no
 * search endpoint today, so callers pass nothing and no SearchAction appears.
 */
export function buildWebSite(opts?: {
    description?: string | null;
    /**
     * Real on-site search URL template, e.g.
     * `${SITE_URL}/search?q={search_term_string}`. Omit when no search exists.
     */
    searchUrlTemplate?: string | null;
}): JsonLdNode {
    const node: JsonLdNode = {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: SITE_URL,
        name: SITE_NAME,
        description: (opts?.description || DEFAULT_DESCRIPTION).trim(),
        publisher: { '@id': ORG_ID },
    };

    const template = opts?.searchUrlTemplate?.trim();
    if (template && template.includes('{search_term_string}')) {
        node.potentialAction = {
            '@type': 'SearchAction',
            target: {
                '@type': 'EntryPoint',
                urlTemplate: template,
            },
            'query-input': 'required name=search_term_string',
        };
    }

    return node;
}

/**
 * Build a WebPage (or a more specific subtype such as `CollectionPage`) node,
 * wired into the shared graph via `isPartOf` → WebSite and `about` →
 * Organization. Only truthful fields are emitted.
 */
export function buildWebPage(opts: {
    /** Absolute canonical URL of the page. Drives the WebPage @id. */
    canonical: string;
    /** Page name/title. */
    name: string;
    description?: string | null;
    /** Schema subtype; defaults to 'WebPage'. e.g. 'CollectionPage'. */
    type?: string;
    /** Absolute or root-relative primary image URL. */
    image?: string | null;
    /** ISO date the underlying content was published. */
    datePublished?: string | null;
    /** ISO date the underlying content was last modified. */
    dateModified?: string | null;
    /** @id of a breadcrumb node to link via `breadcrumb`. */
    breadcrumbId?: string | null;
}): JsonLdNode {
    const canonical = opts.canonical.trim();
    const node: JsonLdNode = {
        '@type': opts.type || 'WebPage',
        '@id': `${canonical}#webpage`,
        url: canonical,
        name: opts.name.trim(),
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': ORG_ID },
    };

    const description = opts.description?.trim();
    if (description) node.description = description;

    const image = absoluteUrl(opts.image || undefined);
    if (image) node.primaryImageOfPage = { '@type': 'ImageObject', url: image };

    const datePublished = opts.datePublished?.trim();
    if (datePublished) node.datePublished = datePublished;

    const dateModified = opts.dateModified?.trim();
    if (dateModified) node.dateModified = dateModified;

    if (opts.breadcrumbId) node.breadcrumb = { '@id': opts.breadcrumbId };

    return node;
}

/**
 * Build a BreadcrumbList node from ordered, already-absolute crumbs.
 * The node's @id is derived from the page canonical so it can be referenced by
 * the WebPage's `breadcrumb` property. Returns `null` when there are no crumbs.
 */
export function buildBreadcrumbList(
    crumbs: BreadcrumbItem[],
    canonical: string
): JsonLdNode | null {
    const clean = (crumbs || [])
        .map((c) => ({ name: c?.name?.trim(), item: c?.item?.trim() }))
        .filter((c): c is BreadcrumbItem => !!c.name && !!c.item);

    if (clean.length === 0) return null;

    return {
        '@type': 'BreadcrumbList',
        '@id': `${canonical.trim()}#breadcrumb`,
        itemListElement: clean.map((c, i) => ({
            '@type': 'ListItem',
            position: i + 1,
            name: c.name,
            item: c.item,
        })),
    };
}

/**
 * Assemble a connected `@graph` document from an arbitrary set of nodes.
 * Falsy nodes are dropped, so callers can pass conditional entities inline.
 *
 * Returns a single JSON-LD object with a top-level `@context` and `@graph`,
 * suitable to hand directly to the `Seo`/`useSeo` `jsonLd` prop. Returns `null`
 * when no nodes remain (so nothing is emitted).
 */
export function buildGraph(
    nodes: Array<JsonLdNode | null | undefined | false>
): JsonLdNode | null {
    const graph = nodes.filter((n): n is JsonLdNode => !!n);
    if (graph.length === 0) return null;
    return {
        '@context': 'https://schema.org',
        '@graph': graph,
    };
}

// ── FAQ / AEO helpers ─────────────────────────────────────────────────────────

/** A single question-answer pair for FAQPage schema. */
export interface FaqEntry {
    question: string;
    answer: string;
}

/**
 * Build a `FAQPage` schema node from a list of question/answer pairs.
 *
 * Truthfulness rule: only emit entries provided by the caller with non-empty
 * question AND answer text. Never fabricate answers.
 *
 * @param entries - Array of {question, answer} objects (pre-verified content only).
 * @param canonical - Absolute URL of the page this FAQ lives on. Used for @id.
 */
export function buildFAQPage(
    entries: FaqEntry[],
    canonical: string
): JsonLdNode | null {
    const clean = (entries || [])
        .map((e) => ({
            question: e?.question?.trim(),
            answer: e?.answer?.trim(),
        }))
        .filter((e): e is { question: string; answer: string } =>
            !!e.question && !!e.answer
        );

    if (clean.length === 0) return null;

    return {
        '@type': 'FAQPage',
        '@id': `${canonical.trim()}#faqpage`,
        url: canonical.trim(),
        mainEntity: clean.map((e) => ({
            '@type': 'Question',
            name: e.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: e.answer,
            },
        })),
    };
}

// ── Article / BlogPosting helpers ─────────────────────────────────────────────

/**
 * Build an `Article` or `BlogPosting` schema node.
 *
 * Truthfulness rule: only emit fields supplied by the caller. Do NOT invent
 * author names, publication dates, word counts, or image URLs.
 *
 * @param opts.canonical  - Absolute URL of the post.
 * @param opts.headline   - Article title / H1 (required).
 * @param opts.description - Meta description or excerpt.
 * @param opts.datePublished - ISO date string from the CMS `published_at` field.
 * @param opts.dateModified  - ISO date string from the CMS `updated_at` field.
 * @param opts.authorName    - Real author name from the CMS; omit if not stored.
 * @param opts.image         - Absolute or root-relative featured image URL.
 * @param opts.type          - Schema subtype; defaults to 'BlogPosting'.
 */
export function buildArticle(opts: {
    canonical: string;
    headline: string;
    description?: string | null;
    datePublished?: string | null;
    dateModified?: string | null;
    authorName?: string | null;
    image?: string | null;
    type?: 'Article' | 'BlogPosting' | 'NewsArticle';
}): JsonLdNode {
    const canonical = opts.canonical.trim();
    const node: JsonLdNode = {
        '@type': opts.type || 'BlogPosting',
        '@id': `${canonical}#article`,
        url: canonical,
        headline: opts.headline.trim(),
        isPartOf: { '@id': WEBSITE_ID },
        publisher: { '@id': ORG_ID },
    };

    const description = opts.description?.trim();
    if (description) node.description = description;

    const datePublished = opts.datePublished?.trim();
    if (datePublished) node.datePublished = datePublished;

    const dateModified = opts.dateModified?.trim();
    if (dateModified) node.dateModified = dateModified;

    const authorName = opts.authorName?.trim();
    if (authorName) {
        node.author = {
            '@type': 'Person',
            name: authorName,
        };
    }

    const image = absoluteUrl(opts.image || undefined);
    if (image) {
        node.image = {
            '@type': 'ImageObject',
            url: image,
        };
    }

    return node;
}


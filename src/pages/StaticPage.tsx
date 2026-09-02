import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Seo } from '../components/seo/Seo';
import NotFound from './NotFound';
import { SITE_URL, SITE_NAME } from '../config/seo';
import {
  buildOrganization,
  buildWebSite,
  buildWebPage,
  buildBreadcrumbList,
  buildGraph,
  type BreadcrumbItem,
} from '../lib/schema';
import styles from './StaticPage.module.css';

interface PageData {
  slug: string;
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  updated_at: string;
  // Optional extended SEO fields — populated once the static_pages table is
  // migrated (see supabase migration) and the public API selects them. Until
  // then they are simply undefined and the <Seo /> fallbacks apply.
  meta_keywords?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
  robots?: string | null;
}

type Status = 'loading' | 'ready' | 'not-found' | 'error';

export default function StaticPage() {
  const { slug } = useParams<{ slug: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    setPage(null);

    fetch(`/api/public/pages/${slug}`)
      .then(async (res) => {
        if (res.status === 404) {
          if (!cancelled) setStatus('not-found');
          return null;
        }
        if (!res.ok) throw new Error(`Request failed: ${res.status}`);
        return res.json();
      })
      .then((body) => {
        if (cancelled || !body) return;
        setPage(body.data);
        setStatus('ready');
      })
      .catch((err) => {
        console.error('[StaticPage] fetch error:', err);
        if (!cancelled) setStatus('error');
      });

    return () => { cancelled = true; };
  }, [slug]);

  // Connected @graph (SEO-20): Organization + WebSite + WebPage + BreadcrumbList
  // via the shared schema core. Emitted only on indexable pages (the Seo
  // component drops jsonLd when robots is noindex). Only truthful CMS fields.
  const jsonLd = useMemo(() => {
    if (!page) return null;

    const canonical =
      page.canonical_url && page.canonical_url.trim()
        ? page.canonical_url.trim()
        : `${SITE_URL}/${page.slug}`;

    const crumbs: BreadcrumbItem[] = [
      { name: SITE_NAME, item: SITE_URL },
      { name: page.title, item: canonical },
    ];
    const breadcrumb = buildBreadcrumbList(crumbs, canonical);

    const webPage = buildWebPage({
      canonical,
      name: page.meta_title || page.title,
      description: page.meta_description || null,
      image: page.og_image || null,
      dateModified: page.updated_at || null,
      breadcrumbId: breadcrumb ? `${canonical}#breadcrumb` : null,
    });

    return buildGraph([
      buildOrganization({ description: page.meta_description || null }),
      buildWebSite(),
      webPage,
      breadcrumb,
    ]);
  }, [page]);

  if (status === 'loading') {
    return <div className={styles.page}><div className={styles.wrap}><p className={styles.statusText}>Loading…</p></div></div>;
  }

  if (status === 'not-found') {
    // A single-segment /:slug that isn't a published CMS page is a genuine
    // 404 — render the shared NotFound view so it emits noindex instead of a
    // soft-200 that crawlers would treat as a valid page.
    return <NotFound />;
  }

  if (status === 'error' || !page) {
    return (
      <div className={styles.page}>
        <div className={styles.wrap}>
          <p className={styles.eyebrow}>Error</p>
          <h1 className={styles.title}>Something went wrong</h1>
          <p className={styles.statusText}>Couldn't load this page right now — please try again shortly.</p>
          <Link to="/" className={styles.homeLink}>← Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <Seo
        title={page.meta_title || page.title}
        description={page.meta_description}
        keywords={page.meta_keywords}
        canonical={page.canonical_url}
        image={page.og_image}
        robots={page.robots}
        ogType="article"
        jsonLd={jsonLd}
      />
      <div className={styles.wrap}>
        <Link to="/" className={styles.homeLink}>← Ordisum</Link>
        <h1 className={styles.title}>{page.title}</h1>
        <p className={styles.updated}>Last updated {new Date(page.updated_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        <div className={styles.content}>
          <ReactMarkdown>{page.content}</ReactMarkdown>
        </div>
      </div>
    </div>
  );
}

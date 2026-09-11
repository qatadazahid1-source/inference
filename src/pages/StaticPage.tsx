import { useEffect, useMemo, useState } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Seo } from '../components/seo/Seo';
import NotFound from './NotFound';
import { SITE_URL, SITE_NAME } from '../config/seo';
import { LEGAL_CONFIG } from '../config/legal';
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
  const { slug: paramSlug } = useParams<{ slug?: string }>();
  const { pathname } = useLocation();
  // For explicit routes like /privacy-policy, useParams returns undefined.
  // Derive slug from the URL pathname as a safe fallback.
  const slug = (paramSlug ?? pathname.replace(/^\//, '').replace(/\/$/, '')) || undefined;
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
    const FALLBACKS: Record<string, { title: string; meta_title: string; meta_description: string; content: string }> = {
      'privacy-policy': {
        title: 'Privacy Policy',
        meta_title: `Privacy Policy — ${LEGAL_CONFIG.BRAND_NAME}`,
        meta_description: `Privacy Policy for ${LEGAL_CONFIG.BRAND_NAME}. How we collect, use, and protect your data.`,
        content: `
Welcome to ${LEGAL_CONFIG.BRAND_NAME}. This Privacy Policy explains how we collect, use, and protect your information.

## Information We Collect
We collect information you provide directly to us, such as when you create an account or contact support. 
We also collect necessary authentication and session data.
- **Account Data**: Name, email address, organization details.
- **API Credentials**: Read-only AI provider API keys, which are encrypted at rest.
- **Usage Data**: We do NOT store your prompts or completions. We only store metadata (token counts, latency, cost) needed for observability and billing.

## How We Use Information
We use the collected information to:
- Provide, maintain, and improve our services.
- Process transactions and send related information.
- Send technical notices, security alerts, and support messages.

## Cookies and Local Storage
We use strictly necessary browser local storage to maintain your authentication session. We do not use third-party advertising cookies. If you consent to analytics, we use privacy-focused tools that do not track personal data across sites.

## Contact Us
For any questions about this Privacy Policy, please contact us at: **${LEGAL_CONFIG.CONTACT_EMAIL}**
        `.trim(),
      },
      'terms': {
        title: 'Terms of Service',
        meta_title: `Terms of Service — ${LEGAL_CONFIG.BRAND_NAME}`,
        meta_description: `Terms of Service and Acceptable Use Policy for ${LEGAL_CONFIG.BRAND_NAME}.`,
        content: `
Welcome to ${LEGAL_CONFIG.BRAND_NAME}. By accessing or using our services, you agree to be bound by these Terms of Service.

## 1. Service Description
${LEGAL_CONFIG.BRAND_NAME} provides AI API observability and cost management tools.

## 2. Account Responsibilities
You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.

## 3. Acceptable Use
You agree not to use the service for any unlawful purpose or in any way that interrupts, damages, or impairs the service.

## 4. Subscriptions and Billing
Fees for our services are billed in advance on a recurring basis as outlined in your selected plan. Please review our Refund Policy for details on cancellations.

## 5. Limitation of Liability
To the maximum extent permitted by applicable law, ${LEGAL_CONFIG.LEGAL_ENTITY_NAME} shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
${LEGAL_CONFIG.GOVERNING_LAW ? `
## 6. Governing Law
These Terms shall be governed by and construed in accordance with the laws of ${LEGAL_CONFIG.GOVERNING_LAW}.
` : ''}
## 7. Contact
For questions regarding these Terms, contact us at: **${LEGAL_CONFIG.CONTACT_EMAIL}**
        `.trim(),
      },
      'refund-policy': {
        title: 'Refund Policy',
        meta_title: `Refund Policy — ${LEGAL_CONFIG.BRAND_NAME}`,
        meta_description: `Refund Policy for ${LEGAL_CONFIG.BRAND_NAME} subscriptions.`,
        content: `
At ${LEGAL_CONFIG.BRAND_NAME}, we strive to provide the best possible service for managing your AI API costs.

## 14-Day Money-Back Guarantee
We offer a **${LEGAL_CONFIG.REFUND_POLICY_TERMS}**. If you are not satisfied with our service during the first 14 days of your initial paid subscription, you may request a full refund.

## How to Request a Refund
To request a refund within the eligible period, please contact us at **${LEGAL_CONFIG.CONTACT_EMAIL}**. Ensure you include your account email and organization details.

## Cancellations
You may cancel your subscription at any time. Cancellation will take effect at the end of the current billing cycle, and you will not be charged again. Refunds are not provided for partial billing periods after the initial 14-day window.
        `.trim(),
      },
    };

    const fallback = slug ? FALLBACKS[slug] : null;

    if (!fallback) {
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
          title={fallback.meta_title}
          description={fallback.meta_description}
          canonical={SITE_URL + "/" + slug}
          robots="index,follow"
          ogType="article"
        />
        <div className={styles.wrap}>
          <Link to="/" className={styles.homeLink}>← {LEGAL_CONFIG.BRAND_NAME}</Link>
          <h1 className={styles.title}>{fallback.title}</h1>
          <p className={styles.updated}>Last updated {LEGAL_CONFIG.EFFECTIVE_DATE}</p>
          <div className={styles.content}>
            <ReactMarkdown>{fallback.content}</ReactMarkdown>
          </div>
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

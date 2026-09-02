import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Seo } from '../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../config/seo';
import {
    buildOrganization,
    buildWebSite,
    buildWebPage,
    buildBreadcrumbList,
    buildArticle,
    buildGraph,
    type BreadcrumbItem,
} from '../lib/schema';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import {
    fetchPublicBlogPost,
    type PublicBlogPost,
} from '../api/services/blog.service';
import styles from './BlogPost.module.css';

type Status = 'loading' | 'ready' | 'not-found' | 'error';

function formatDate(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogPost() {
    const { slug } = useParams<{ slug: string }>();
    const [post, setPost] = useState<PublicBlogPost | null>(null);
    const [status, setStatus] = useState<Status>('loading');

    useEffect(() => {
        if (!slug) return;
        const controller = new AbortController();
        setStatus('loading');
        setPost(null);

        fetchPublicBlogPost(slug, controller.signal)
            .then((data) => {
                if (controller.signal.aborted) return;
                if (!data) {
                    setStatus('not-found');
                    return;
                }
                setPost(data);
                setStatus('ready');
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                console.error('[BlogPost] fetch error:', err);
                setStatus('error');
            });

        return () => controller.abort();
    }, [slug]);

    // Connected @graph (SEO-20): Organization + WebSite + WebPage + BreadcrumbList
    // plus a BlogPosting for the article itself, all sharing stable @ids via the
    // shared schema core. Emitted only on indexable posts (the Seo component
    // drops jsonLd when robots is noindex). Canonical prefers an explicit
    // override, else the computed post URL. Only truthful CMS fields are emitted.
    const jsonLd = useMemo(() => {
        if (!post) return null;

        const canonical =
            post.canonical_url && post.canonical_url.trim()
                ? post.canonical_url.trim()
                : `${SITE_URL}/blog/${post.slug}`;

        const crumbs: BreadcrumbItem[] = [
            { name: SITE_NAME, item: SITE_URL },
            { name: 'Blog', item: `${SITE_URL}/blog` },
            { name: post.title, item: canonical },
        ];
        const breadcrumb = buildBreadcrumbList(crumbs, canonical);

        const webPage = buildWebPage({
            canonical,
            name: post.meta_title || post.title,
            description: post.meta_description || post.excerpt || null,
            image: post.og_image || post.featured_image || null,
            datePublished: post.published_at || null,
            dateModified: post.updated_at || null,
            breadcrumbId: breadcrumb ? `${canonical}#breadcrumb` : null,
        });

        // BlogPosting — uses the shared buildArticle helper (schema.ts).
        // No fields are fabricated; all values come directly from the CMS row.
        const article = buildArticle({
            canonical,
            headline: post.meta_title || post.title,
            description: post.excerpt || post.meta_description || null,
            datePublished: post.published_at || null,
            dateModified: post.updated_at || null,
            authorName: post.author || null,
            image: post.featured_image || post.og_image || null,
        });

        return buildGraph([
            buildOrganization({ description: post.excerpt || null }),
            buildWebSite(),
            webPage,
            article,
            breadcrumb,
        ]);
    }, [post]);

    if (status === 'loading') {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.wrap}>
                    <p className={styles.statusText}>Loading…</p>
                </div>
                <Footer />
            </div>
        );
    }

    if (status === 'not-found') {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.wrap}>
                    <p className={styles.eyebrow}>404</p>
                    <h1 className={styles.title}>Post not found</h1>
                    <p className={styles.statusText}>
                        This article doesn&apos;t exist or isn&apos;t published yet.
                    </p>
                    <Link to="/blog" className={styles.backLink}>← Back to blog</Link>
                </div>
                <Footer />
            </div>
        );
    }

    if (status === 'error' || !post) {
        return (
            <div className={styles.page}>
                <Navbar />
                <div className={styles.wrap}>
                    <p className={styles.eyebrow}>Error</p>
                    <h1 className={styles.title}>Something went wrong</h1>
                    <p className={styles.statusText}>
                        Couldn&apos;t load this article right now — please try again shortly.
                    </p>
                    <Link to="/blog" className={styles.backLink}>← Back to blog</Link>
                </div>
                <Footer />
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <Seo
                title={post.meta_title || post.title}
                description={post.meta_description || post.excerpt}
                keywords={post.meta_keywords}
                canonical={post.canonical_url || `${SITE_URL}/blog/${post.slug}`}
                image={post.og_image || post.featured_image}
                robots={post.robots}
                ogType="article"
                jsonLd={jsonLd}
            />
            <Navbar />

            <article className={styles.wrap}>
                {/* Breadcrumbs */}
                <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
                    <Link to="/" className={styles.crumbLink}>Home</Link>
                    <span aria-hidden className={styles.crumbSep}>/</span>
                    <Link to="/blog" className={styles.crumbLink}>Blog</Link>
                    <span aria-hidden className={styles.crumbSep}>/</span>
                    <span className={styles.crumbCurrent}>{post.title}</span>
                </nav>

                {post.category && <p className={styles.category}>{post.category}</p>}
                <h1 className={styles.title}>{post.title}</h1>

                <div className={styles.meta}>
                    {post.author && <span>{post.author}</span>}
                    {post.author && post.published_at && <span aria-hidden> · </span>}
                    {post.published_at && (
                        <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                    )}
                </div>

                {post.featured_image && (
                    <div className={styles.hero}>
                        <img
                            className={styles.heroImg}
                            src={post.featured_image}
                            alt={post.title}
                            fetchPriority="high"
                            decoding="async"
                        />
                    </div>
                )}

                <div className={styles.content}>
                    <ReactMarkdown>{post.body || ''}</ReactMarkdown>
                </div>

                {post.tags && post.tags.length > 0 && (
                    <div className={styles.tags}>
                        {post.tags.map((tag) => (
                            <span key={tag} className={styles.tag}>{tag}</span>
                        ))}
                    </div>
                )}

                <div className={styles.footerNav}>
                    <Link to="/blog" className={styles.backLink}>← Back to blog</Link>
                </div>
            </article>

            <Footer />
        </div>
    );
}

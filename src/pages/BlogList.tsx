import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../config/seo';
import {
    buildOrganization,
    buildWebSite,
    buildBreadcrumbList,
    buildGraph,
    WEBSITE_ID,
    type BreadcrumbItem,
} from '../lib/schema';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import {
    fetchPublicBlogList,
    type PublicBlogListItem,
} from '../api/services/blog.service';
import styles from './BlogList.module.css';

type Status = 'loading' | 'ready' | 'error';

function formatDate(value: string | null): string {
    if (!value) return '';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function BlogList() {
    const [posts, setPosts] = useState<PublicBlogListItem[]>([]);
    const [status, setStatus] = useState<Status>('loading');

    useEffect(() => {
        const controller = new AbortController();
        setStatus('loading');

        fetchPublicBlogList(controller.signal)
            .then((data) => {
                setPosts(data);
                setStatus('ready');
            })
            .catch((err) => {
                if (controller.signal.aborted) return;
                console.error('[BlogList] fetch error:', err);
                setStatus('error');
            });

        return () => controller.abort();
    }, []);

    // Blog index JSON-LD expressed as a connected schema.org @graph:
    // Organization + WebSite (shared entities) + CollectionPage (the blog index,
    // @id {canonical}#webpage) whose mainEntity is an ItemList of the REAL
    // published posts, plus a BreadcrumbList (Home → Blog). Built only from the
    // posts actually returned by the public API — no fabricated entries.
    const jsonLd = useMemo(() => {
        const canonical = `${SITE_URL}/blog`;
        const description = `Insights, guides, and product updates from ${SITE_NAME} on LLM cost optimization, observability, and AI gateway best practices.`;

        const itemList =
            posts.length > 0
                ? {
                    '@type': 'ItemList',
                    '@id': `${canonical}#postlist`,
                    itemListElement: posts.map((post, index) => ({
                        '@type': 'ListItem',
                        position: index + 1,
                        url: `${SITE_URL}/blog/${post.slug}`,
                        name: post.title,
                    })),
                }
                : null;

        const collectionPage = {
            '@type': 'CollectionPage',
            '@id': `${canonical}#webpage`,
            url: canonical,
            name: `Blog | ${SITE_NAME}`,
            description,
            isPartOf: { '@id': WEBSITE_ID },
            ...(itemList ? { mainEntity: { '@id': `${canonical}#postlist` } } : {}),
        };

        const crumbs: BreadcrumbItem[] = [
            { name: SITE_NAME, item: SITE_URL },
            { name: 'Blog', item: canonical },
        ];

        return buildGraph([
            buildOrganization({ description }),
            buildWebSite({ description }),
            collectionPage,
            itemList,
            buildBreadcrumbList(crumbs, canonical),
        ]);
    }, [posts]);

    return (
        <div className={styles.page}>
            <Seo
                title="Blog"
                description={`Insights, guides, and product updates from ${SITE_NAME} on LLM cost optimization, observability, and AI gateway best practices.`}
                canonical={`${SITE_URL}/blog`}
                ogType="website"
                jsonLd={jsonLd}
            />
            <Navbar />

            <header className={styles.header}>
                <div className={styles.container}>
                    <p className={styles.eyebrow}>Blog</p>
                    <h1 className={styles.headline}>Insights &amp; guides</h1>
                    <p className={styles.sub}>
                        Practical writing on LLM cost control, observability, and building reliable AI infrastructure.
                    </p>
                </div>
            </header>

            <main className={styles.container}>
                {status === 'loading' && (
                    <p className={styles.statusText}>Loading posts…</p>
                )}

                {status === 'error' && (
                    <p className={styles.statusText}>
                        Couldn&apos;t load posts right now — please try again shortly.
                    </p>
                )}

                {status === 'ready' && posts.length === 0 && (
                    <p className={styles.statusText}>No posts published yet. Check back soon.</p>
                )}

                {status === 'ready' && posts.length > 0 && (
                    <div className={styles.grid}>
                        {posts.map((post) => (
                            <Link key={post.slug} to={`/blog/${post.slug}`} className={styles.card}>
                                {post.featured_image && (
                                    <div className={styles.thumbWrap}>
                                        <img
                                            className={styles.thumb}
                                            src={post.featured_image}
                                            alt={post.title}
                                            loading="lazy"
                                            decoding="async"
                                        />
                                    </div>
                                )}
                                <div className={styles.cardBody}>
                                    {post.category && (
                                        <span className={styles.category}>{post.category}</span>
                                    )}
                                    <h2 className={styles.cardTitle}>{post.title}</h2>
                                    {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
                                    <div className={styles.meta}>
                                        {post.author && <span>{post.author}</span>}
                                        {post.author && post.published_at && <span aria-hidden> · </span>}
                                        {post.published_at && (
                                            <time dateTime={post.published_at}>{formatDate(post.published_at)}</time>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>

            <Footer />
        </div>
    );
}

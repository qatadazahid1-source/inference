import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../config/seo';
import {
    buildOrganization,
    buildWebSite,
    buildWebPage,
    buildBreadcrumbList,
    buildFAQPage,
    buildGraph,
    type BreadcrumbItem,
} from '../lib/schema';
import Navbar from '../components/Navbar/Navbar';
import Footer from '../components/Footer/Footer';
import PricingSection from '../components/PricingSection/PricingSection';
import styles from './MarketingPage.module.css';

/* ─────────────────────────────────────────────────────────────
 * Structured content model (content_blocks JSONB)
 *
 * This mirrors the shape produced by the Admin → Pages "Content"
 * tab (friendly, no raw JSON). Every part is optional so a page can
 * use as little or as much as it needs. The renderer defends against
 * missing/partial data so a half-filled CMS page never crashes.
 *
 * The model is BACKWARD-COMPATIBLE: the original hero/sections/faqs/
 * finalCta shape still renders exactly as before. New optional blocks
 * (intro, problem, solution, benefits, comparisonTable, prosCons,
 * workflow, relatedLinks) power richer alternative / use-case pages.
 * ──────────────────────────────────────────────────────────── */
interface CtaBlock {
    label?: string | null;
    href?: string | null;
}
interface HeroBlock {
    eyebrow?: string | null;
    headline?: string | null; // becomes the page's single <h1>
    subheadline?: string | null;
    primaryCta?: CtaBlock | null;
    secondaryCta?: CtaBlock | null;
}
interface SectionItem {
    title?: string | null;
    description?: string | null;
}
interface ContentSection {
    heading?: string | null;
    subheading?: string | null;
    items?: SectionItem[] | null;
}
interface FaqItem {
    question?: string | null;
    answer?: string | null;
}
interface FinalCtaBlock {
    headline?: string | null;
    description?: string | null;
    primaryCta?: CtaBlock | null;
    secondaryCta?: CtaBlock | null;
}

/* ── New optional blocks ─────────────────────────────────────── */
interface IntroBlock {
    heading?: string | null;
    body?: string | null;
}
interface PointsBlock {
    heading?: string | null;
    body?: string | null;
    points?: (string | null)[] | null;
}
interface BenefitsBlock {
    heading?: string | null;
    subheading?: string | null;
    items?: SectionItem[] | null;
}
interface ComparisonRow {
    label?: string | null;
    values?: (string | null)[] | null;
}
interface ComparisonTableBlock {
    heading?: string | null;
    subheading?: string | null;
    columns?: (string | null)[] | null;
    rows?: ComparisonRow[] | null;
}
interface ProsConsBlock {
    heading?: string | null;
    prosTitle?: string | null;
    consTitle?: string | null;
    pros?: (string | null)[] | null;
    cons?: (string | null)[] | null;
}
interface WorkflowStep {
    title?: string | null;
    description?: string | null;
}
interface WorkflowBlock {
    heading?: string | null;
    subheading?: string | null;
    steps?: WorkflowStep[] | null;
}
interface RelatedLink {
    label?: string | null;
    href?: string | null;
    description?: string | null;
}
interface RelatedLinksBlock {
    heading?: string | null;
    links?: RelatedLink[] | null;
}

interface ContentBlocks {
    hero?: HeroBlock | null;
    intro?: IntroBlock | null;
    problem?: PointsBlock | null;
    solution?: PointsBlock | null;
    benefits?: BenefitsBlock | null;
    sections?: ContentSection[] | null;
    comparisonTable?: ComparisonTableBlock | null;
    prosCons?: ProsConsBlock | null;
    workflow?: WorkflowBlock | null;
    faqs?: FaqItem[] | null;
    relatedLinks?: RelatedLinksBlock | null;
    finalCta?: FinalCtaBlock | null;
}

interface PageData {
    slug: string;
    title: string;
    content: string;
    meta_title: string;
    meta_description: string;
    meta_keywords?: string | null;
    canonical_url?: string | null;
    og_image?: string | null;
    robots?: string | null;
    content_blocks?: ContentBlocks | null;
    updated_at: string;
}

type Status = 'loading' | 'ready' | 'not-found' | 'error';

/** Page template — controls slug resolution, canonical path and breadcrumb trail. */
type MarketingTemplate = 'marketing' | 'alternative' | 'usecase';

interface MarketingPageProps {
    /**
     * The static_pages slug to render for a FIXED route (e.g. "features",
     * "pricing", "security"). For dynamic templates (alternative / usecase)
     * omit this and the slug is read from the route param instead.
     */
    slug?: string;
    /** Which template this page renders as. Defaults to "marketing". */
    template?: MarketingTemplate;
}

const isNonEmpty = (v?: string | null): v is string =>
    typeof v === 'string' && v.trim().length > 0;

const hasCta = (cta?: CtaBlock | null): cta is CtaBlock =>
    !!cta && isNonEmpty(cta.label) && isNonEmpty(cta.href);

/** Keep only non-empty strings from a loose string list. */
const cleanList = (list?: (string | null)[] | null): string[] =>
    (list ?? []).map((s) => (s ?? '').trim()).filter((s) => s.length > 0);

/** Internal links render via <Link>, external/absolute via <a>. */
function CtaLink({ cta, variant }: { cta: CtaBlock; variant: 'primary' | 'secondary' }) {
    const href = (cta.href || '').trim();
    const label = (cta.label || '').trim();
    const className = variant === 'primary' ? styles.ctaPrimary : styles.ctaSecondary;
    const isInternal = href.startsWith('/') && !href.startsWith('//');

    if (isInternal) {
        return (
            <Link to={href} className={className}>
                {label}
            </Link>
        );
    }
    return (
        <a href={href} className={className} rel="noopener noreferrer">
            {label}
        </a>
    );
}

/** Resolve template-specific slug/path details. */
function resolveTemplate(template: MarketingTemplate, routeSlug: string) {
    switch (template) {
        case 'alternative':
            return {
                dbSlug: `alternatives-${routeSlug}`,
                canonicalPath: `/alternatives/${routeSlug}`,
                trail: [{ name: 'Alternatives', item: `${SITE_URL}/alternatives` }],
            };
        case 'usecase':
            return {
                dbSlug: `use-cases-${routeSlug}`,
                canonicalPath: `/use-cases/${routeSlug}`,
                trail: [{ name: 'Use cases', item: `${SITE_URL}/use-cases` }],
            };
        default:
            return {
                dbSlug: routeSlug,
                canonicalPath: `/${routeSlug}`,
                trail: [] as Array<{ name: string; item: string }>,
            };
    }
}

export default function MarketingPage({ slug, template = 'marketing' }: MarketingPageProps) {
    const params = useParams<{ slug?: string }>();
    // Fixed routes pass `slug` directly; dynamic templates read the route param.
    const routeSlug = (slug ?? params.slug ?? '').trim();
    const { dbSlug, canonicalPath, trail } = resolveTemplate(template, routeSlug);

    const [page, setPage] = useState<PageData | null>(null);
    const [status, setStatus] = useState<Status>('loading');

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');
        setPage(null);

        if (!dbSlug) {
            setStatus('not-found');
            return;
        }

        fetch(`/api/public/pages/${dbSlug}`)
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
                console.error('[MarketingPage] fetch error:', err);
                if (!cancelled) setStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, [dbSlug]);

    const blocks = page?.content_blocks ?? null;
    const hero = blocks?.hero ?? null;

    const intro = blocks?.intro ?? null;
    const introVisible = intro && (isNonEmpty(intro.heading) || isNonEmpty(intro.body));

    const problem = blocks?.problem ?? null;
    const problemPoints = cleanList(problem?.points);
    const problemVisible =
        problem && (isNonEmpty(problem.heading) || isNonEmpty(problem.body) || problemPoints.length > 0);

    const solution = blocks?.solution ?? null;
    const solutionPoints = cleanList(solution?.points);
    const solutionVisible =
        solution && (isNonEmpty(solution.heading) || isNonEmpty(solution.body) || solutionPoints.length > 0);

    const benefits = blocks?.benefits ?? null;
    const benefitItems = (benefits?.items ?? []).filter(
        (i) => isNonEmpty(i?.title) || isNonEmpty(i?.description)
    );
    const benefitsVisible =
        benefits && (isNonEmpty(benefits.heading) || isNonEmpty(benefits.subheading) || benefitItems.length > 0);

    const sections = (blocks?.sections ?? []).filter(
        (s) => isNonEmpty(s?.heading) || (s?.items ?? []).some((i) => isNonEmpty(i?.title) || isNonEmpty(i?.description))
    );

    const comparison = blocks?.comparisonTable ?? null;
    const comparisonColumns = cleanList(comparison?.columns);
    const comparisonRows = (comparison?.rows ?? []).filter(
        (r) => isNonEmpty(r?.label) || cleanList(r?.values).length > 0
    );
    const comparisonVisible =
        comparison && (comparisonColumns.length > 0 && comparisonRows.length > 0);

    const prosCons = blocks?.prosCons ?? null;
    const pros = cleanList(prosCons?.pros);
    const cons = cleanList(prosCons?.cons);
    const prosConsVisible = prosCons && (pros.length > 0 || cons.length > 0);

    const workflow = blocks?.workflow ?? null;
    const workflowSteps = (workflow?.steps ?? []).filter(
        (s) => isNonEmpty(s?.title) || isNonEmpty(s?.description)
    );
    const workflowVisible =
        workflow && (isNonEmpty(workflow.heading) || isNonEmpty(workflow.subheading) || workflowSteps.length > 0);

    const faqs = (blocks?.faqs ?? []).filter((f) => isNonEmpty(f?.question) && isNonEmpty(f?.answer));

    const related = blocks?.relatedLinks ?? null;
    const relatedLinks = (related?.links ?? []).filter((l) => isNonEmpty(l?.label) && isNonEmpty(l?.href));
    const relatedVisible = related && relatedLinks.length > 0;

    const finalCta = blocks?.finalCta ?? null;

    // The page's single H1 comes from the hero headline, falling back to the
    // page title so there is always exactly one H1 for SEO.
    const h1 = isNonEmpty(hero?.headline) ? hero!.headline!.trim() : page?.title ?? '';

    // Connected @graph (SEO-20): Organization + WebSite + WebPage + BreadcrumbList
    // via the shared schema core, PLUS a FAQPage when the page has real FAQs.
    // The FAQPage links back to the WebPage identity. Emitted on indexable pages
    // only (the Seo component drops jsonLd when robots is noindex). No fabricated
    // data — FAQ entries come straight from CMS content_blocks.
    const jsonLd = useMemo(() => {
        if (!page) return null;

        // WebPage + breadcrumb so the page has a clear identity/trail.
        const canonical = isNonEmpty(page.canonical_url)
            ? page.canonical_url!.trim()
            : `${SITE_URL}${canonicalPath}`;

        const crumbs: BreadcrumbItem[] = [
            { name: SITE_NAME, item: SITE_URL },
            ...trail.map((t) => ({ name: t.name, item: t.item })),
            { name: page.meta_title || page.title, item: canonical },
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

        // FAQPage — uses the shared buildFAQPage helper (schema.ts).
        // Only emitted when real CMS FAQ entries exist; no fabricated answers.
        const faqPage = buildFAQPage(
            faqs.map((f) => ({ question: f.question!, answer: f.answer! })),
            canonical
        );

        return buildGraph([
            buildOrganization({ description: page.meta_description || null }),
            buildWebSite(),
            webPage,
            faqPage,
            breadcrumb,
        ]);
    }, [page, faqs, canonicalPath, trail]);

    if (status === 'loading') {
        return (
            <div className={styles.page}>
                <div className={styles.stateWrap}>
                    <p className={styles.stateText}>Loading…</p>
                </div>
            </div>
        );
    }

    if (status === 'not-found') {
        return (
            <div className={styles.page}>
                <div className={styles.stateWrap}>
                    <p className={styles.eyebrow}>404</p>
                    <h1 className={styles.stateTitle}>Page not found</h1>
                    <p className={styles.stateText}>
                        This page doesn't exist or isn't published yet.
                    </p>
                    <Link to="/" className={styles.homeLink}>
                        ← Back to home
                    </Link>
                </div>
            </div>
        );
    }

    if (status === 'error' || !page) {
        return (
            <div className={styles.page}>
                <div className={styles.stateWrap}>
                    <p className={styles.eyebrow}>Error</p>
                    <h1 className={styles.stateTitle}>Something went wrong</h1>
                    <p className={styles.stateText}>
                        Couldn't load this page right now — please try again shortly.
                    </p>
                    <Link to="/" className={styles.homeLink}>
                        ← Back to home
                    </Link>
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
                ogType="website"
                jsonLd={jsonLd}
            />
            <Navbar />

            {/* ── Hero ─────────────────────────────────────────── */}
            <section className={styles.hero}>
                <div className={styles.container}>
                    {isNonEmpty(hero?.eyebrow) && (
                        <p className={styles.heroEyebrow}>{hero!.eyebrow!.trim()}</p>
                    )}
                    <h1 className={styles.heroHeadline}>{h1}</h1>
                    {isNonEmpty(hero?.subheadline) && (
                        <p className={styles.heroSub}>{hero!.subheadline!.trim()}</p>
                    )}
                    {(hasCta(hero?.primaryCta) || hasCta(hero?.secondaryCta)) && (
                        <div className={styles.heroCtas}>
                            {hasCta(hero?.primaryCta) && (
                                <CtaLink cta={hero!.primaryCta!} variant="primary" />
                            )}
                            {hasCta(hero?.secondaryCta) && (
                                <CtaLink cta={hero!.secondaryCta!} variant="secondary" />
                            )}
                        </div>
                    )}
                </div>
            </section>

            {/* ── Intro ────────────────────────────────────────── */}
            {introVisible && (
                <section className={styles.section}>
                    <div className={styles.containerNarrow}>
                        {isNonEmpty(intro!.heading) && (
                            <h2 className={styles.sectionHeading}>{intro!.heading!.trim()}</h2>
                        )}
                        {isNonEmpty(intro!.body) && (
                            <p className={styles.prose}>{intro!.body!.trim()}</p>
                        )}
                    </div>
                </section>
            )}

            {/* ── Problem / Solution (two-column narrative) ─────── */}
            {(problemVisible || solutionVisible) && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        <div className={styles.psGrid}>
                            {problemVisible && (
                                <div className={`${styles.psCard} ${styles.psProblem}`}>
                                    {isNonEmpty(problem!.heading) && (
                                        <h2 className={styles.psHeading}>{problem!.heading!.trim()}</h2>
                                    )}
                                    {isNonEmpty(problem!.body) && (
                                        <p className={styles.cardText}>{problem!.body!.trim()}</p>
                                    )}
                                    {problemPoints.length > 0 && (
                                        <ul className={styles.pointList}>
                                            {problemPoints.map((p, i) => (
                                                <li key={i}>{p}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                            {solutionVisible && (
                                <div className={`${styles.psCard} ${styles.psSolution}`}>
                                    {isNonEmpty(solution!.heading) && (
                                        <h2 className={styles.psHeading}>{solution!.heading!.trim()}</h2>
                                    )}
                                    {isNonEmpty(solution!.body) && (
                                        <p className={styles.cardText}>{solution!.body!.trim()}</p>
                                    )}
                                    {solutionPoints.length > 0 && (
                                        <ul className={`${styles.pointList} ${styles.pointListPositive}`}>
                                            {solutionPoints.map((p, i) => (
                                                <li key={i}>{p}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Benefits ─────────────────────────────────────── */}
            {benefitsVisible && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        {isNonEmpty(benefits!.heading) && (
                            <h2 className={styles.sectionHeading}>{benefits!.heading!.trim()}</h2>
                        )}
                        {isNonEmpty(benefits!.subheading) && (
                            <p className={styles.sectionSub}>{benefits!.subheading!.trim()}</p>
                        )}
                        {benefitItems.length > 0 && (
                            <div className={styles.grid}>
                                {benefitItems.map((item, i) => (
                                    <article key={i} className={styles.card}>
                                        {isNonEmpty(item.title) && (
                                            <h3 className={styles.cardTitle}>{item.title!.trim()}</h3>
                                        )}
                                        {isNonEmpty(item.description) && (
                                            <p className={styles.cardText}>{item.description!.trim()}</p>
                                        )}
                                    </article>
                                ))}
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* ── Content sections ─────────────────────────────── */}
            {sections.map((section, sIdx) => {
                const items = (section.items ?? []).filter(
                    (i) => isNonEmpty(i?.title) || isNonEmpty(i?.description)
                );
                return (
                    <section key={sIdx} className={styles.section}>
                        <div className={styles.container}>
                            {isNonEmpty(section.heading) && (
                                <h2 className={styles.sectionHeading}>{section.heading!.trim()}</h2>
                            )}
                            {isNonEmpty(section.subheading) && (
                                <p className={styles.sectionSub}>{section.subheading!.trim()}</p>
                            )}
                            {items.length > 0 && (
                                <div className={styles.grid}>
                                    {items.map((item, iIdx) => (
                                        <article key={iIdx} className={styles.card}>
                                            {isNonEmpty(item.title) && (
                                                <h3 className={styles.cardTitle}>{item.title!.trim()}</h3>
                                            )}
                                            {isNonEmpty(item.description) && (
                                                <p className={styles.cardText}>{item.description!.trim()}</p>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                );
            })}

            {/* ── Comparison table ─────────────────────────────── */}
            {comparisonVisible && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        {isNonEmpty(comparison!.heading) && (
                            <h2 className={styles.sectionHeading}>{comparison!.heading!.trim()}</h2>
                        )}
                        {isNonEmpty(comparison!.subheading) && (
                            <p className={styles.sectionSub}>{comparison!.subheading!.trim()}</p>
                        )}
                        <div className={styles.tableScroll}>
                            <table className={styles.compareTable}>
                                <thead>
                                    <tr>
                                        <th scope="col" />
                                        {comparisonColumns.map((col, i) => (
                                            <th key={i} scope="col">{col}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {comparisonRows.map((row, rIdx) => {
                                        const values = row.values ?? [];
                                        return (
                                            <tr key={rIdx}>
                                                <th scope="row">{(row.label ?? '').trim()}</th>
                                                {comparisonColumns.map((_, cIdx) => (
                                                    <td key={cIdx}>{(values[cIdx] ?? '').toString().trim()}</td>
                                                ))}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </section>
            )}

            {/* ── Pros & Cons ──────────────────────────────────── */}
            {prosConsVisible && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        {isNonEmpty(prosCons!.heading) && (
                            <h2 className={styles.sectionHeading}>{prosCons!.heading!.trim()}</h2>
                        )}
                        <div className={styles.psGrid}>
                            {pros.length > 0 && (
                                <div className={`${styles.psCard} ${styles.psSolution}`}>
                                    <h3 className={styles.cardTitle}>
                                        {isNonEmpty(prosCons!.prosTitle) ? prosCons!.prosTitle!.trim() : 'Pros'}
                                    </h3>
                                    <ul className={`${styles.pointList} ${styles.pointListPositive}`}>
                                        {pros.map((p, i) => (
                                            <li key={i}>{p}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {cons.length > 0 && (
                                <div className={`${styles.psCard} ${styles.psProblem}`}>
                                    <h3 className={styles.cardTitle}>
                                        {isNonEmpty(prosCons!.consTitle) ? prosCons!.consTitle!.trim() : 'Cons'}
                                    </h3>
                                    <ul className={styles.pointList}>
                                        {cons.map((c, i) => (
                                            <li key={i}>{c}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Workflow / How it works ──────────────────────── */}
            {workflowVisible && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        {isNonEmpty(workflow!.heading) && (
                            <h2 className={styles.sectionHeading}>{workflow!.heading!.trim()}</h2>
                        )}
                        {isNonEmpty(workflow!.subheading) && (
                            <p className={styles.sectionSub}>{workflow!.subheading!.trim()}</p>
                        )}
                        {workflowSteps.length > 0 && (
                            <ol className={styles.workflowList}>
                                {workflowSteps.map((step, i) => (
                                    <li key={i} className={styles.workflowStep}>
                                        <span className={styles.workflowNum}>{i + 1}</span>
                                        <div className={styles.workflowBody}>
                                            {isNonEmpty(step.title) && (
                                                <h3 className={styles.cardTitle}>{step.title!.trim()}</h3>
                                            )}
                                            {isNonEmpty(step.description) && (
                                                <p className={styles.cardText}>{step.description!.trim()}</p>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ol>
                        )}
                    </div>
                </section>
            )}

            {/* ── Live pricing (real prices from the plans table) ──
             * On /pricing we embed the existing PricingSection, which is
             * the single source of truth for prices — it fetches
             * /api/public/pricing-plans itself. CMS content_blocks control
             * only the surrounding marketing copy (hero, sections, FAQs,
             * final CTA); we never duplicate pricing data in the CMS. */}
            {slug === 'pricing' && <PricingSection />}

            {/* ── FAQs ─────────────────────────────────────────── */}
            {faqs.length > 0 && (
                <section className={styles.section}>
                    <div className={styles.containerNarrow}>
                        <h2 className={styles.sectionHeading}>Frequently asked questions</h2>
                        <div className={styles.faqList}>
                            {faqs.map((faq, fIdx) => (
                                <details key={fIdx} className={styles.faqItem}>
                                    <summary className={styles.faqQuestion}>{faq.question!.trim()}</summary>
                                    <p className={styles.faqAnswer}>{faq.answer!.trim()}</p>
                                </details>
                            ))}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Related links (internal linking for SEO) ─────── */}
            {relatedVisible && (
                <section className={styles.section}>
                    <div className={styles.container}>
                        <h2 className={styles.sectionHeading}>
                            {isNonEmpty(related!.heading) ? related!.heading!.trim() : 'Related'}
                        </h2>
                        <div className={styles.grid}>
                            {relatedLinks.map((link, i) => {
                                const href = (link.href || '').trim();
                                const label = (link.label || '').trim();
                                const desc = (link.description || '').trim();
                                const isInternal = href.startsWith('/') && !href.startsWith('//');
                                const inner = (
                                    <>
                                        <h3 className={styles.cardTitle}>{label}</h3>
                                        {desc && <p className={styles.cardText}>{desc}</p>}
                                    </>
                                );
                                return isInternal ? (
                                    <Link key={i} to={href} className={`${styles.card} ${styles.linkCard}`}>
                                        {inner}
                                    </Link>
                                ) : (
                                    <a
                                        key={i}
                                        href={href}
                                        className={`${styles.card} ${styles.linkCard}`}
                                        rel="noopener noreferrer"
                                    >
                                        {inner}
                                    </a>
                                );
                            })}
                        </div>
                    </div>
                </section>
            )}

            {/* ── Final CTA ────────────────────────────────────── */}
            {finalCta &&
                (isNonEmpty(finalCta.headline) ||
                    isNonEmpty(finalCta.description) ||
                    hasCta(finalCta.primaryCta) ||
                    hasCta(finalCta.secondaryCta)) && (
                    <section className={styles.finalCta}>
                        <div className={styles.containerNarrow}>
                            {isNonEmpty(finalCta.headline) && (
                                <h2 className={styles.finalHeadline}>{finalCta.headline!.trim()}</h2>
                            )}
                            {isNonEmpty(finalCta.description) && (
                                <p className={styles.finalText}>{finalCta.description!.trim()}</p>
                            )}
                            {(hasCta(finalCta.primaryCta) || hasCta(finalCta.secondaryCta)) && (
                                <div className={styles.heroCtas}>
                                    {hasCta(finalCta.primaryCta) && (
                                        <CtaLink cta={finalCta.primaryCta!} variant="primary" />
                                    )}
                                    {hasCta(finalCta.secondaryCta) && (
                                        <CtaLink cta={finalCta.secondaryCta!} variant="secondary" />
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                )}

            <Footer />
        </div>
    );
}

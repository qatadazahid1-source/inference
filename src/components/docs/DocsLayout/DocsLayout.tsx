import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import Navbar from '../../Navbar/Navbar'
import DocsSidebar from '../DocsSidebar/DocsSidebar'
import DocsContent from '../DocsContent/DocsContent'
import DocsTOC from '../DocsTOC/DocsTOC'
import { Seo } from '../../seo/Seo'
import {
  SITE_NAME,
  DEFAULT_OG_IMAGE,
  buildCanonicalUrl,
} from '../../../config/seo'
import {
  buildOrganization,
  buildWebSite,
  buildBreadcrumbList,
  buildGraph,
  ORG_ID,
  WEBSITE_ID,
  type BreadcrumbItem,
} from '../../../lib/schema'
import type { DocPage } from '../../../docs/content/index'
import styles from './DocsLayout.module.css'

interface Props { page: DocPage }

export default function DocsLayout({ page }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [page.slug])

  const canonical = buildCanonicalUrl(`/docs/${page.slug}`)
  const docsHome = buildCanonicalUrl('/docs')

  // Structured data expressed as a single connected schema.org @graph:
  // Organization + WebSite (shared entities) + TechArticle (this documentation
  // page, @id {canonical}#webpage) + BreadcrumbList (Home → Docs → this page).
  // For the FAQ doc we additionally emit a FAQPage built from the real section
  // data in faq.ts. Built from real page data only — no invented values.
  const jsonLd = useMemo(() => {
    const techArticle = {
      '@type': 'TechArticle',
      '@id': `${canonical}#webpage`,
      headline: page.title,
      name: page.title,
      description: page.description,
      url: canonical,
      inLanguage: 'en',
      isPartOf: { '@id': WEBSITE_ID },
      publisher: { '@id': ORG_ID },
    }

    const crumbs: BreadcrumbItem[] = [
      { name: 'Home', item: buildCanonicalUrl('/') },
      { name: 'Docs', item: docsHome },
      { name: page.title, item: canonical },
    ]

    // FAQPage — only for the FAQ doc, and only from the actual section content.
    const faqNode =
      page.slug === 'faq'
        ? (() => {
            const questions = page.sections
              .map((s) => {
                const parts: string[] = []
                if (s.body) parts.push(s.body)
                if (s.list && s.list.length) parts.push(s.list.join('. '))
                if (s.table) {
                  const { headers, rows } = s.table
                  parts.push(
                    rows
                      .map((r) =>
                        r.map((c, i) => `${headers[i]}: ${c}`).join(', '),
                      )
                      .join('. '),
                  )
                }
                const answer = parts.join(' ').trim()
                if (!answer) return null
                return {
                  '@type': 'Question',
                  name: s.heading,
                  acceptedAnswer: { '@type': 'Answer', text: answer },
                }
              })
              .filter(Boolean)

            return questions.length
              ? {
                  '@type': 'FAQPage',
                  '@id': `${canonical}#faq`,
                  isPartOf: { '@id': `${canonical}#webpage` },
                  mainEntity: questions,
                }
              : null
          })()
        : null

    return buildGraph([
      buildOrganization({ description: page.description }),
      buildWebSite({ description: page.description }),
      techArticle,
      buildBreadcrumbList(crumbs, canonical),
      faqNode,
    ])
  }, [page.title, page.description, page.slug, page.sections, canonical, docsHome])

  return (
    <div className={styles.root}>
      <Seo
        title={`${page.title} | ${SITE_NAME} Docs`}
        description={page.description}
        keywords={`${page.title}, documentation, ${SITE_NAME}, AI API cost management, docs`}
        canonical={canonical}
        robots="index,follow"
        ogType="article"
        image={DEFAULT_OG_IMAGE || undefined}
        jsonLd={jsonLd}
      />
      <Navbar />
      <div className={styles.body}>
        <DocsSidebar activePath={`/docs/${page.slug}`} />
        <main className={styles.main}>
          <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
            <ol className={styles.breadcrumbList}>
              <li className={styles.breadcrumbItem}>
                <Link to="/" className={styles.breadcrumbLink}>Home</Link>
              </li>
              <li className={styles.breadcrumbSep} aria-hidden="true">/</li>
              <li className={styles.breadcrumbItem}>
                <Link to="/docs" className={styles.breadcrumbLink}>Docs</Link>
              </li>
              <li className={styles.breadcrumbSep} aria-hidden="true">/</li>
              <li className={styles.breadcrumbItem}>
                <span className={styles.breadcrumbCurrent} aria-current="page">
                  {page.title}
                </span>
              </li>
            </ol>
          </nav>
          <DocsContent page={page} />
        </main>
        <DocsTOC sections={page.sections} />
      </div>
    </div>
  )
}

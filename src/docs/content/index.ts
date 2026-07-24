import { overviewPage }         from './overview'
import { quickstartPage }       from './quickstart'
import { providersPage }        from './providers'
import { dashboardPage }        from './dashboard'
import { budgetAlertsPage }     from './budget-alerts'
import { roiCalculatorDocPage } from './roi-calculator-doc'
import { teamsPage }            from './teams'
import { apiAuthPage }          from './api-auth'
import { apiEndpointsPage }     from './api-endpoints'
import { faqPage }              from './faq'
import { troubleshootingPage }  from './troubleshooting'
import { changelogPage }        from './changelog'
import { DocPage }              from './types'

export const allPages: DocPage[] = [
  overviewPage,
  quickstartPage,
  providersPage,
  changelogPage,
  dashboardPage,
  budgetAlertsPage,
  roiCalculatorDocPage,
  teamsPage,
  apiAuthPage,
  apiEndpointsPage,
  faqPage,
  troubleshootingPage,
]

export function getPageBySlug(slug: string): DocPage | undefined {
  return allPages.find(p => p.slug === slug)
}

export interface SearchResult {
  pageTitle:   string
  pageSlug:    string
  sectionId:   string
  sectionText: string
  matchType:   'title' | 'section' | 'body'
}

export function searchDocs(query: string): SearchResult[] {
  if (!query.trim() || query.length < 2) return []
  const q = query.toLowerCase()
  const results: SearchResult[] = []

  allPages.forEach(page => {
    if (page.title.toLowerCase().includes(q)) {
      results.push({
        pageTitle:   page.title,
        pageSlug:    page.slug,
        sectionId:   '',
        sectionText: page.description,
        matchType:   'title',
      })
    }
    page.sections.forEach(sec => {
      const headingMatch = sec.heading.toLowerCase().includes(q)
      const bodyMatch    = (sec.body ?? '').toLowerCase().includes(q)
      const listMatch    = (sec.list ?? []).some(i => i.toLowerCase().includes(q))
      if (headingMatch || bodyMatch || listMatch) {
        results.push({
          pageTitle:   page.title,
          pageSlug:    page.slug,
          sectionId:   sec.id,
          sectionText: sec.heading,
          matchType:   headingMatch ? 'section' : 'body',
        })
      }
    })
  })

  const seen = new Set<string>()
  return results.filter(r => {
    const key = `${r.pageSlug}#${r.sectionId}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  }).slice(0, 12)
}

export type { DocPage, DocSection, Callout, CodeExample, ContentTable } from './types'
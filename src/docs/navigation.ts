import type { DocPage } from './content/index'
import { allPages } from './content/index'

export interface NavItem {
  label: string
  path: string
}

export interface NavSection {
  title: string
  items: NavItem[]
}

// Build the navigation from allPages, grouping by section
export const docsNavigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: allPages
      .filter(p => ['overview', 'quickstart'].includes(p.slug))
      .map(p => ({ label: p.title, path: `/docs/${p.slug}` })),
  },
  {
    title: 'Features',
    items: allPages
      .filter(p => ['dashboard', 'budget-alerts', 'roi-calculator-doc', 'providers'].includes(p.slug))
      .map(p => ({ label: p.title, path: `/docs/${p.slug}` })),
  },
  {
    title: 'Team & Security',
    items: allPages
      .filter(p => ['teams', 'api-auth'].includes(p.slug))
      .map(p => ({ label: p.title, path: `/docs/${p.slug}` })),
  },
  {
    title: 'API Reference',
    items: allPages
      .filter(p => ['api-endpoints'].includes(p.slug))
      .map(p => ({ label: p.title, path: `/docs/${p.slug}` })),
  },
  {
    title: 'Support',
    items: allPages
      .filter(p => ['faq', 'troubleshooting', 'changelog'].includes(p.slug))
      .map(p => ({ label: p.title, path: `/docs/${p.slug}` })),
  },
].filter(s => s.items.length > 0)

export type { DocPage }

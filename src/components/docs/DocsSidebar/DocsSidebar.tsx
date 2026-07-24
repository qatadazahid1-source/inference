import { useState } from 'react'
import { Link } from 'react-router-dom'
import { docsNavigation } from '../../../docs/navigation'
import styles from './DocsSidebar.module.css'

interface Props { activePath: string }

export default function DocsSidebar({ activePath }: Props) {
  const [query, setQuery] = useState('')
  const [openSections, setOpen] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    docsNavigation.forEach(sec => {
      const hasActive = sec.items.some(i => i.path === activePath)
      initial[sec.title] = hasActive
    })
    return initial
  })

  const toggleSection = (title: string) =>
    setOpen(prev => ({ ...prev, [title]: !prev[title] }))

  const filtered = query.trim()
    ? docsNavigation
        .map(sec => ({
          ...sec,
          items: sec.items.filter(i =>
            i.label.toLowerCase().includes(query.toLowerCase())
          ),
        }))
        .filter(sec => sec.items.length > 0)
    : docsNavigation

  return (
    <aside className={styles.sidebar}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.brandDots} aria-hidden="true">
            <span /><span /><span /><span />
          </span>
          <span className={styles.brandText}>Inference Intelligence</span>
        </Link>

        <div className={styles.searchWrap}>
          <svg className={styles.searchIcon} width="14" height="14"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            placeholder="Search docs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={styles.searchInput}
          />
          {query && (
            <button className={styles.searchClear}
              onClick={() => setQuery('')} aria-label="Clear">
              ×
            </button>
          )}
        </div>

        <nav className={styles.nav}>
          {filtered.map(section => (
            <div key={section.title} className={styles.section}>
              <button
                className={styles.sectionTitle}
                onClick={() => toggleSection(section.title)}
              >
                {section.title}
                <svg
                  className={`${styles.chevron} ${
                    openSections[section.title] ? styles.chevronOpen : ''
                  }`}
                  width="12" height="12" fill="none"
                  stroke="currentColor" strokeWidth="2"
                  viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m9 18 6-6-6-6"/>
                </svg>
              </button>

              {(openSections[section.title] || query) && (
                <ul className={styles.items}>
                  {section.items.map(item => (
                    <li key={item.path}>
                      <Link
                        to={item.path}
                        className={`${styles.link} ${
                          activePath === item.path ? styles.linkActive : ''
                        }`}
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </nav>

        <a href="#pricing" className={styles.ctaLink}>
          ← Back to site
        </a>
      </div>
    </aside>
  )
}
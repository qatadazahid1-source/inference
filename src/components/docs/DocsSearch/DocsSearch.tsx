import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchDocs, SearchResult } from '../../../docs/content/index'
import styles from './DocsSearch.module.css'

interface Props {
  isOpen:  boolean
  onClose: () => void
}

export default function DocsSearch({ isOpen, onClose }: Props) {
  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [active,  setActive]  = useState(0)
  const inputRef  = useRef<HTMLInputElement>(null)
  const navigate  = useNavigate()

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setActive(0)
    }
  }, [isOpen])

  useEffect(() => {
    setResults(searchDocs(query))
    setActive(0)
  }, [query])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === 'Escape')      { onClose(); return }
      if (e.key === 'ArrowDown')   { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')     { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter' && results[active]) {
        const r = results[active]
        navigate(`/docs/${r.pageSlug}${r.sectionId ? '#' + r.sectionId : ''}`)
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, results, active, navigate, onClose])

  const goTo = (r: SearchResult) => {
    navigate(`/docs/${r.pageSlug}${r.sectionId ? '#' + r.sectionId : ''}`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>

        <div className={styles.inputRow}>
          <svg className={styles.searchIcon} width="16" height="16"
            fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="8"/>
            <path strokeLinecap="round" d="m21 21-4.35-4.35"/>
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search documentation..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className={styles.input}
          />
          <kbd className={styles.esc}>Esc</kbd>
        </div>

        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((r, i) => (
              <button
                key={`${r.pageSlug}-${r.sectionId}-${i}`}
                className={`${styles.result} ${i === active ? styles.resultActive : ''}`}
                onClick={() => goTo(r)}
                onMouseEnter={() => setActive(i)}
              >
                <div className={styles.resultLeft}>
                  <span className={styles.resultPage}>{r.pageTitle}</span>
                  {r.sectionId && (
                    <span className={styles.resultSection}>→ {r.sectionText}</span>
                  )}
                </div>
                <span className={`${styles.resultBadge} ${styles[r.matchType]}`}>
                  {r.matchType}
                </span>
              </button>
            ))}
          </div>
        )}

        {query.length > 1 && results.length === 0 && (
          <div className={styles.empty}>
            <p>No results for "<strong>{query}</strong>"</p>
            <p className={styles.emptySub}>
              Try searching for a feature name, provider, or action
            </p>
          </div>
        )}

        {query.length === 0 && (
          <div className={styles.hint}>
            <p>Quick links</p>
            <div className={styles.quickLinks}>
              {[
                { label: 'Overview',   slug: 'overview'    },
                { label: 'Quickstart', slug: 'quickstart'  },
                { label: 'Providers',  slug: 'providers'   },
                { label: 'FAQ',        slug: 'faq'         },
                { label: 'API Auth',   slug: 'api-auth'    },
              ].map(l => (
                <button
                  key={l.slug}
                  className={styles.quickLink}
                  onClick={() => { navigate(`/docs/${l.slug}`); onClose() }}
                >
                  {l.label} →
                </button>
              ))}
            </div>
          </div>
        )}

        <div className={styles.footer}>
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>Esc</kbd> close</span>
        </div>
      </div>
    </div>
  )
}
import { useState, useEffect } from 'react'
import type { DocSection } from '../../../docs/content/index'
import styles from './DocsTOC.module.css'

interface Props { sections: DocSection[] }

export default function DocsTOC({ sections }: Props) {
  const [active, setActive] = useState(sections[0]?.id ?? '')

  useEffect(() => {
    const ids = sections.map(s => s.id)
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) setActive(entry.target.id)
        })
      },
      { rootMargin: '-80px 0px -60% 0px' }
    )
    ids.forEach(id => {
      const el = document.getElementById(id)
      if (el) observer.observe(el)
    })
    return () => observer.disconnect()
  }, [sections])

  return (
    <aside className={styles.toc}>
      <div className={styles.inner}>
        <p className={styles.title}>On this page</p>
        <nav>
          {sections.map(sec => (
            <a
              key={sec.id}
              href={`#${sec.id}`}
              className={`${styles.link} ${active === sec.id ? styles.linkActive : ''}`}
            >
              {sec.heading}
            </a>
          ))}
        </nav>
      </div>
    </aside>
  )
}
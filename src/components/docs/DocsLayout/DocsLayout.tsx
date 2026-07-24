import { useEffect } from 'react'
import Navbar from '../../Navbar/Navbar'
import DocsSidebar from '../DocsSidebar/DocsSidebar'
import DocsContent from '../DocsContent/DocsContent'
import DocsTOC from '../DocsTOC/DocsTOC'
import type { DocPage } from '../../../docs/content/index'
import styles from './DocsLayout.module.css'

interface Props { page: DocPage }

export default function DocsLayout({ page }: Props) {
  useEffect(() => { window.scrollTo(0, 0) }, [page.slug])

  return (
    <div className={styles.root}>
      <Navbar />
      <div className={styles.body}>
        <DocsSidebar activePath={`/docs/${page.slug}`} />
        <main className={styles.main}>
          <DocsContent page={page} />
        </main>
        <DocsTOC sections={page.sections} />
      </div>
    </div>
  )
}
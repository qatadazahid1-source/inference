import { Link } from 'react-router-dom'
import type { DocPage, DocSection } from '../../../docs/content/index'
import CodeBlock from '../CodeBlock/CodeBlock'
import styles from './DocsContent.module.css'

const calloutIcons: Record<string, string> = {
  info: 'ℹ️', warning: '⚠️', tip: '💡', danger: '🚨',
}

function Section({ sec, level = 2 }: { sec: DocSection; level?: 2 | 3 }) {
  const Tag = level === 2 ? 'h2' : 'h3'
  return (
    <div id={sec.id} className={styles.section}>
      <Tag className={level === 2 ? styles.h2 : styles.h3}>{sec.heading}</Tag>

      {sec.body && sec.body.split('\n\n').map((p, i) => (
        <p key={i} className={styles.p}>{p}</p>
      ))}

      {sec.callout && (
        <div className={`${styles.callout} ${styles[sec.callout.type]}`}>
          <span className={styles.calloutIcon}>{calloutIcons[sec.callout.type]}</span>
          <div>
            {sec.callout.title && (
              <p className={styles.calloutTitle}>{sec.callout.title}</p>
            )}
            <p className={styles.calloutText}>{sec.callout.text}</p>
          </div>
        </div>
      )}

      {sec.code && <CodeBlock example={sec.code} />}

      {sec.list && (
        <ul className={styles.list}>
          {sec.list.map((item, i) => (
            <li key={i} className={styles.listItem}>
              <span className={styles.bullet}>→</span>{item}
            </li>
          ))}
        </ul>
      )}

      {sec.table && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {sec.table.headers.map(h => (
                  <th key={h} className={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sec.table.rows.map((row, i) => (
                <tr key={i} className={styles.tr}>
                  {row.map((cell, j) => (
                    <td key={j} className={styles.td}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sec.subsections?.map(sub => (
        <Section key={sub.id} sec={sub} level={3} />
      ))}
    </div>
  )
}

interface Props { page: DocPage }

export default function DocsContent({ page }: Props) {
  return (
    <article className={styles.article}>
      <header className={styles.header}>
        <h1 className={styles.h1}>{page.title}</h1>
        <p className={styles.description}>{page.description}</p>
        <div className={styles.divider} />
      </header>

      {page.sections.map(sec => (
        <Section key={sec.id} sec={sec} />
      ))}

      <div className={styles.helpful}>
        <p className={styles.helpfulLabel}>Was this page helpful?</p>
        <div className={styles.helpfulBtns}>
          <button className={styles.helpfulBtn}>👍 Yes</button>
          <button className={styles.helpfulBtn}>👎 No</button>
        </div>
      </div>

      {(page.prev || page.next) && (
        <nav className={styles.prevNext}>
          {page.prev
            ? <Link to={page.prev.path} className={styles.prevLink}>
                ← {page.prev.label}
              </Link>
            : <span />
          }
          {page.next && (
            <Link to={page.next.path} className={styles.nextLink}>
              {page.next.label} →
            </Link>
          )}
        </nav>
      )}
    </article>
  )
}
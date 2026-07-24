import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import styles from './SolutionSection.module.css'

const solutions = [
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Track Every Dollar',
    body: 'Real-time cost tracking across 10+ AI providers — automatically organized by model, team, and project.',
    color: 'var(--pine-400)',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
    title: 'Calculate Real ROI',
    body: "Prove productivity gains with automated ROI reports your CFO will actually trust.",
    color: 'var(--pine-300)',
  },
  {
    icon: (
      <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Alert Before Overspend',
    body: "Budget alerts at 50%, 75%, 90% — before it becomes an awkward conversation.",
    color: 'var(--amber)',
  },
]

export default function SolutionSection() {
  const ref = useScrollAnimation()
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className={`${styles.section} fade-in-up`}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>
          Inference Intelligence gives you{' '}
          <span className={styles.accent}>complete visibility</span>{' '}
          — in minutes.
        </h2>
        <div className={styles.grid}>
          {solutions.map((s, i) => (
            <div key={i} data-animate className={`${styles.card} fade-in-up`}>
              <div className={styles.iconWrap} style={{ background: `${s.color}1A` }}>
                <span className={styles.icon}>{s.icon}</span>
              </div>
              <h3 className={styles.cardTitle}>{s.title}</h3>
              <p className={styles.cardDesc}>{s.body}</p>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ background: s.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import styles from './WhySwitch.module.css'

const reasons = [
  {
    number: '01',
    title: 'Unified Billing',
    desc: 'Instead of managing 12 different provider invoices, get one single, clear statement of your AI footprint.',
  },
  {
    number: '02',
    title: 'Latency SLA',
    desc: 'We guarantee 99.99% availability by automatically failing over between providers during outages.',
  },
  {
    number: '03',
    title: 'Prompt Version Control',
    desc: 'Roll back prompts as easily as you roll back code. See how changes impact cost and performance in real-time.',
  },
]

export default function WhySwitch() {
  const ref = useScrollAnimation()
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className={`${styles.section} fade-in-up`}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Why Enterprise Teams Switch</h2>
        <div className={styles.grid}>
          {reasons.map((r, i) => (
            <div key={i} data-animate className={`${styles.card} fade-in-up`}>
              <div className={styles.number}>{r.number}</div>
              <h3 className={styles.title}>{r.title}</h3>
              <p className={styles.desc}>{r.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
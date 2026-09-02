import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import styles from './ComparisonSection.module.css'

const features = [
  { name: 'Real-time Token Decoding', us: true, zero: false, apptio: false },
  { name: 'PII Redaction Engine', us: true, zero: 'partial', apptio: false },
  { name: 'Outcome Attribution', us: true, zero: false, apptio: false },
  { name: 'Automatic ROI Calculation', us: true, zero: false, apptio: 'partial' },
  { name: 'Multi-Provider Routing', us: true, zero: false, apptio: false },
  { name: 'Budget Alert Thresholds', us: true, zero: true, apptio: true },
]

export default function ComparisonSection() {
  const ref = useScrollAnimation()
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className={`${styles.section} fade-in-up`}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Why Enterprise Leaders Switch</h2>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Feature</th>
                <th className={styles.us}>Ordisum</th>
                <th>CloudZero</th>
                <th>Apptio</th>
              </tr>
            </thead>
            <tbody>
              {features.map((f, i) => (
                <tr key={i}>
                  <td>{f.name}</td>
                  <td className={styles.us}>
                    {f.us === true ? (
                      <span className={styles.yes}>YES</span>
                    ) : (
                      <span className={styles.partial}>PARTIAL</span>
                    )}
                  </td>
                  <td>
                    {f.zero === true ? (
                      <span className={styles.yes}>YES</span>
                    ) : f.zero === 'partial' ? (
                      <span className={styles.partial}>PARTIAL</span>
                    ) : (
                      <span className={styles.no}>—</span>
                    )}
                  </td>
                  <td>
                    {f.apptio === true ? (
                      <span className={styles.yes}>YES</span>
                    ) : f.apptio === 'partial' ? (
                      <span className={styles.partial}>PARTIAL</span>
                    ) : (
                      <span className={styles.no}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}
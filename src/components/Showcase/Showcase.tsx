import { useScrollAnimation } from '../../hooks/useScrollAnimation'
import styles from './Showcase.module.css'

const rows = [
  {
    label: 'COST ANALYTICS',
    title: 'Full Visibility Into Every AI Dollar Spent',
    desc: 'Drill down into spending by provider, model, team, or project. See exactly where costs are coming from with real-time breakdowns that update every 5 minutes.',
    reverse: false,
  },
  {
    label: 'ROI REPORTING',
    title: 'From Raw Logs to Board-Ready ROI in Minutes',
    desc: 'Automatically calculate time saved multiplied by hourly rate minus AI cost. Generate PDF reports that CFOs actually trust — no spreadsheet gymnastics required.',
    reverse: true,
  },
  {
    label: 'BUDGET CONTROL',
    title: 'Catch Overspend Before It Hits the Finance Report',
    desc: 'Set thresholds at 50%, 75%, 90%, and 100%. Get instant Slack, email, or SMS alerts before a runaway prompt burns through your entire monthly budget.',
    reverse: false,
  },
]

function CostAnalyticsMockup() {
  return (
    <div className={styles.mockup}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupDots}>
          <span></span><span></span><span></span>
        </div>
        <span className={styles.mockupTitle}>Cost Analytics</span>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.mockupGrid}>
          {[
            { label: 'Total Spend', value: '$47,892', change: '+12.3%', green: false },
            { label: 'Avg/Day', value: '$1,596', change: '+8.1%', green: false },
            { label: 'Tokens', value: '14.2M', change: '+5.4%', green: false },
          ].map((m, i) => (
            <div key={i} className={styles.mockupCard}>
              <span className={styles.mockupLabel}>{m.label}</span>
              <span className={styles.mockupValue}>{m.value}</span>
              <span className={`${styles.mockupChange} ${m.green ? styles.green : ''}`}>{m.change}</span>
            </div>
          ))}
        </div>
        <div className={styles.mockupBars}>
          {[
            { name: 'GPT-4o', pct: 70, color: 'var(--pine-500)' },
            { name: 'Claude', pct: 52, color: 'var(--pine-400)' },
            { name: 'Gemini', pct: 35, color: 'var(--amber)' },
            { name: 'Azure', pct: 24, color: 'var(--text-muted)' },
          ].map((b, i) => (
            <div key={i} className={styles.mockupBarRow}>
              <span>{b.name}</span>
              <div className={styles.mockupBarTrack}>
                <div style={{ width: `${b.pct}%`, background: b.color }}></div>
              </div>
              <span>{b.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ROIReportMockup() {
  return (
    <div className={styles.mockup}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupDots}>
          <span></span><span></span><span></span>
        </div>
        <span className={styles.mockupTitle}>ROI Reports</span>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.roiChart}>
          <div className={styles.roiBars}>
            {[65, 78, 92, 85, 100].map((h, i) => (
              <div key={i} className={styles.roiBar} style={{ height: `${h}%` }}>
                <span>{['Q1','Q2','Q3','Q4','Proj'][i]}</span>
              </div>
            ))}
          </div>
        </div>
        <div className={styles.roiStats}>
          <div className={styles.roiStat}>
            <span className={styles.roiStatLabel}>Productivity Gain</span>
            <span className={styles.roiStatValue}>347%</span>
          </div>
          <div className={styles.roiStat}>
            <span className={styles.roiStatLabel}>Cost Savings</span>
            <span className={styles.roiStatValue}>$124K</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function BudgetControlMockup() {
  return (
    <div className={styles.mockup}>
      <div className={styles.mockupHeader}>
        <div className={styles.mockupDots}>
          <span></span><span></span><span></span>
        </div>
        <span className={styles.mockupTitle}>Budget Alerts</span>
      </div>
      <div className={styles.mockupBody}>
        <div className={styles.budgetList}>
          {[
            { name: 'Production RAG', spent: 8500, total: 10000, alert: 'warning' },
            { name: 'Dev Sandbox', spent: 2400, total: 5000, alert: 'none' },
            { name: 'Customer Chat', spent: 9800, total: 10000, alert: 'danger' },
          ].map((b, i) => (
            <div key={i} className={styles.budgetItem}>
              <div className={styles.budgetHeader}>
                <span>{b.name}</span>
                <span className={b.alert === 'danger' ? styles.danger : b.alert === 'warning' ? styles.warning : ''}>
                  {b.spent}/{b.total}
                </span>
              </div>
              <div className={styles.budgetBar}>
                <div style={{ width: `${(b.spent/b.total)*100}%`, background: b.alert === 'danger' ? 'var(--red)' : b.alert === 'warning' ? 'var(--amber)' : 'var(--pine-400)' }}></div>
              </div>
            </div>
          ))}
        </div>
        <div className={styles.alertPanel}>
          <div className={styles.alertItem}>
            <span className={styles.alertDot}></span>
            <span>GPT-4o at 87% budget</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const mockups = [CostAnalyticsMockup, ROIReportMockup, BudgetControlMockup]

export default function Showcase() {
  const ref = useScrollAnimation()
  return (
    <section ref={ref as React.RefObject<HTMLElement>} className={`${styles.section} fade-in-up`}>
      <div className={styles.inner}>
        <h2 className={styles.heading}>Built for AI Finance Teams</h2>
        <p className={styles.sub}>Every feature designed to answer the questions your CFO asks.</p>

        <div className={styles.rows}>
          {rows.map((row, i) => (
            <div key={i} className={`${styles.row} ${row.reverse ? styles.reverse : ''}`}>
              <div className={styles.content}>
                <span className={styles.label}>{row.label}</span>
                <h3 className={styles.title}>{row.title}</h3>
                <p className={styles.desc}>{row.desc}</p>
              </div>
              <div className={styles.visual}>
                {mockups[i]()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
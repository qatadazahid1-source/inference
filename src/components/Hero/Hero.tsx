import { Link } from 'react-router-dom'
import DashboardMockup from './DashboardMockup'
import styles from './Hero.module.css'

const LEDGER_ROWS = [
  { provider: 'OpenAI', amount: 18420 },
  { provider: 'Anthropic', amount: 14980 },
  { provider: 'Groq', amount: 6210 },
  { provider: 'Google', amount: 8282 },
]

const TOTAL = LEDGER_ROWS.reduce((sum, r) => sum + r.amount, 0)

function formatUSD(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
}

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>AI Spend, Reconciled</p>

        <h1 className={styles.headline}>
          Every AI invoice.
          <br />
          One <span className={styles.underline}>clear</span> number.
        </h1>

        <p className={styles.sub}>
          Inference Intelligence pulls usage straight from OpenAI, Anthropic, Groq, and
          every provider you run — and reconciles it into one ledger your finance team
          can actually read. Your API keys never leave your environment.
        </p>

        <div className={styles.buttons}>
          <Link to="/signup" className={styles.btnPrimary}>
            Start Free Trial
          </Link>
          <a
            href="https://www.youtube.com/watch?v=DEMO"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.btnSecondary}
          >
            Watch a 2-min Demo
          </a>
        </div>

        <p className={styles.socialProof}>Trusted by 500+ engineering and finance teams</p>
      </div>

      {/* Proof row — real product surfaces, not icon-and-text feature
          cards. The dashboard mockup is the actual app UI recreated; the
          ledger is a focused close-up of what it produces. This pairing
          (whole product + one sharp detail) is deliberately modeled on how
          serious product sites prove a claim instead of illustrating it. */}
      <div className={styles.proofRow}>
        <div className={styles.proofPrimary}>
          <DashboardMockup />
        </div>

        <div className={styles.ledger} aria-hidden="true">
          <div className={styles.ledgerHead}>
            <span>AI Spend — This Month</span>
            <span className={styles.ledgerLive}>Live</span>
          </div>

          <div className={styles.ledgerRows}>
            {LEDGER_ROWS.map((row) => (
              <div key={row.provider} className={styles.ledgerRow}>
                <span className={styles.ledgerProvider}>{row.provider}</span>
                <span className={styles.ledgerDots} />
                <span className={styles.ledgerAmount}>{formatUSD(row.amount)}</span>
              </div>
            ))}
          </div>

          <div className={styles.ledgerTotalRow}>
            <span className={styles.ledgerTotalLabel}>Reconciled Total</span>
            <span className={styles.ledgerTotalAmount}>{formatUSD(TOTAL)}</span>
          </div>

          <p className={styles.ledgerFoot}>
            <span className={styles.ledgerDelta}>↓ 8.2%</span> vs. last month, across 4 providers
          </p>
        </div>
      </div>
    </section>
  )
}

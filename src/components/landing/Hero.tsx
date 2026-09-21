import React from 'react';
import { Link } from 'react-router-dom';
import styles from './Hero.module.css';

export const Hero: React.FC = () => {
  return (
    <section className={styles.hero} id="overview">
      <h1 className={styles.headline}>
        Where is the money going,<br />and is it under control?
      </h1>
      
      <p className={styles.subtext}>
        Ordisum sits between your app and your AI providers. It meters every request, attributes spend to the right model and team, and enforces budgets before they're exceeded — not after. One base-URL swap. No SDK.
      </p>
      
      <div className={styles.ctas}>
        <Link to="/auth/signup" className={styles.btnPrimary}>
          Connect Your First API Key
        </Link>
        <Link to="/docs" className={styles.btnSecondary}>
          Read Documentation
        </Link>
      </div>

      <div className={styles.evidenceRow}>
        <div className={styles.evidenceItem}>
          <span className={styles.dot} />
          <span>Real-time Token Telemetry</span>
        </div>
        <div className={styles.evidenceItem}>
          <span className={styles.dot} />
          <span>Hard Budget Enforcement</span>
        </div>
        <div className={styles.evidenceItem}>
          <span className={styles.dot} />
          <span>Zero Prompt Storage</span>
        </div>
        <div className={styles.evidenceItem}>
          <span className={styles.dot} />
          <span>AES-256 Key Encryption</span>
        </div>
      </div>
    </section>
  );
};

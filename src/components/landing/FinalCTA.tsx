import React from 'react';
import { Link } from 'react-router-dom';
import styles from './FinalCTA.module.css';

export const FinalCTA: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.box}>
        <h2 className={styles.headline}>
          Your AI spend deserves more than a line item.
        </h2>
        <p className={styles.subtext}>
          14-day free trial. No credit card. Cancel anytime.
        </p>
        <div className={styles.ctas}>
          <Link to="/auth/signup" className={styles.btnPrimary}>
            Connect Your First API Key
          </Link>
          <Link to="/docs" className={styles.btnSecondary}>
            View Documentation
          </Link>
        </div>
        <div className={styles.note}>14-day trial · No credit card required · Instant setup</div>
      </div>
    </section>
  );
};

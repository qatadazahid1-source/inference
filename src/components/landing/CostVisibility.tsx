import React from 'react';
import styles from './CostVisibility.module.css';

export const CostVisibility: React.FC = () => {
  return (
    <section className={styles.section} id="problem-solution">
      <div className={styles.header}>
        <h2 className={styles.title}>
          Stop treating AI API spend as a month-end surprise
        </h2>
      </div>

      <div className={styles.grid}>
        <div className={styles.cardProblem}>
          <h3 className={styles.cardTitle}>
            <span>Without Dedicated Telemetry</span>
          </h3>
          <div className={styles.list}>
            <div className={styles.item}>
              <div className={styles.itemTitle}>Black-Box Invoice Aggregate</div>
              <p className={styles.itemText}>
                Monthly provider invoices show a lump sum without attributing cost to specific models, microservices, or development teams.
              </p>
            </div>
            <div className={styles.item}>
              <div className={styles.itemTitle}>Post-Facto Notification</div>
              <p className={styles.itemText}>
                Native email alerts notify you after a budget threshold has already been breached — leading to unbudgeted cost overruns.
              </p>
            </div>
            <div className={styles.item}>
              <div className={styles.itemTitle}>Uncontrolled External Key Distribution</div>
              <p className={styles.itemText}>
                API keys distributed to internal tools or external scripts run with full account privileges and zero usage boundaries.
              </p>
            </div>
          </div>
        </div>

        <div className={styles.cardSolution}>
          <h3 className={styles.cardTitle}>
            <span>With Ordisum Observability</span>
          </h3>
          <div className={styles.list}>
            <div className={styles.itemSolution}>
              <div className={styles.itemTitle}>Per-Model &amp; Per-Key Attribution</div>
              <p className={styles.itemText}>
                Every single request is tracked with exact prompt/completion token breakdown, provider latency, and computed cost.
              </p>
            </div>
            <div className={styles.itemSolution}>
              <div className={styles.itemTitle}>Hard Pre-Limit Budget Enforcement</div>
              <p className={styles.itemText}>
                Set strict daily, monthly, or quarterly caps. Ordisum throttles or blocks gateway traffic before limits are exceeded.
              </p>
            </div>
            <div className={styles.itemSolution}>
              <div className={styles.itemTitle}>Granular Proxy Key Provisioning</div>
              <p className={styles.itemText}>
                Issue scoped gateway keys (`ii_sk_...`) with custom permissions, model restrictions, and instant one-click revocation.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

import React from 'react';
import styles from './FeatureSummaries.module.css';

export const FeatureSummaries: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.feature}>
          <h3>Cost Analytics</h3>
          <p>Every request that routes through the Ordisum Gateway gets logged — model, provider, token count, latency, cost. The dashboard breaks that down by day, by model, by team, and by project. Data refreshes every five minutes. No polling required.</p>
        </div>
        
        <div className={styles.feature}>
          <h3>Budget Enforcement</h3>
          <p>You set a monthly or quarterly limit. When spend hits that limit, Ordisum blocks further requests automatically. Not a notification that you've already overspent — an actual block, before it happens. You can set different limits per team or project.</p>
        </div>
        
        <div className={styles.feature}>
          <h3>Smart Alerts & Anomaly Detection</h3>
          <p>Threshold alerts fire at 50%, 75%, 90%, and 100% of your budget via Email, Slack, or SMS. On top of that, anomaly detection watches for hours where spend exceeds 3× your trailing 7-day average — the pattern that usually means a bad deploy or a runaway loop — and fires an alert within the hour.</p>
        </div>
        
        <div className={styles.feature}>
          <h3>ROI Calculator</h3>
          <p>Put in your team size, hourly rate, and which tasks AI is replacing or accelerating. The calculator outputs a business-case number: not "AI is valuable" in the abstract, but an actual figure you can bring to a budget conversation.</p>
        </div>
        
        <div className={styles.feature}>
          <h3>External API Gateway</h3>
          <p>Issue read-only platform keys (ii_sk_...) to third-party apps, internal scripts, or automations. Every call routes through Ordisum and shows up in the same dashboard. Revocable immediately. No change needed on the caller's side.</p>
        </div>
      </div>
    </section>
  );
};

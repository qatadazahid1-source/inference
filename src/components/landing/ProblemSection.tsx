import React from 'react';
import styles from './ProblemSection.module.css';

export const ProblemSection: React.FC = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <p className={styles.text}>
          The AI bill arrives. It's 40% higher than last month. You open three provider dashboards to figure out why. The OpenAI dashboard shows totals by day. The Anthropic console shows something else. The Azure portal is its own experience entirely. By the time you piece together what happened, the next billing cycle is already in progress.
        </p>
        <p className={styles.highlight}>
          That's not a reporting problem. That's an infrastructure gap.
        </p>
      </div>
    </section>
  );
};

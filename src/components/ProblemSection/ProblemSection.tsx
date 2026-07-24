import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './ProblemSection.module.css';

interface PainPoint {
  num: string;
  title: string;
  body: string;
}

const painPoints: PainPoint[] = [
  {
    num:'01',
    title:'Unpredictable Invoices',
    body:'Consumption spikes break quarterly budgets before you can react — with zero early warning.',
  },
  {
    num:'02',
    title:'Zero Attribution',
    body:'You cannot tell which team, project, or model drove that surprise $40,000 line item.',
  },
  {
    num:'03',
    title:'No Provable ROI',
    body:'Mapping AI model usage to actual business outcomes is impossible without the right layer.',
  },
];

const ProblemSection: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <div className={styles.left}>
          <span className={styles.label}>The Problem</span>
          <h2 className={styles.headline}>
            AI Spend Has Become<br />
            <span className={styles.gradientText}>Completely Invisible</span>
          </h2>
          <p className={styles.body}>
            The costs of running AI at scale have exploded past what traditional 
            finance tools can track. You're flying blind on the largest technology 
            investment of the decade.
          </p>

          <div className={styles.painList}>
            {painPoints.map((point) => (
              <div key={point.num} className={styles.painItem}>
                <span className={styles.painNum}>{point.num}</span>
                <div className={styles.painContent}>
                  <h4 className={styles.painTitle}>{point.title}</h4>
                  <p className={styles.painBody}>{point.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.comparison}>
              <div className={styles.stateBox}>
                <span className={styles.stateLabel}>Before</span>
                <div className={styles.chaosChart}>
                  {[35, 80, 45, 90, 20, 75, 55, 95, 40].map((h, i) => (
                    <div key={i} className={styles.chaosBar} style={{ height: h }} />
                  ))}
                </div>
                <div className={styles.statusDot} style={{ background: 'var(--red)' }} />
              </div>
              
              <div className={styles.arrow}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>

              <div className={styles.stateBox}>
                <span className={styles.stateLabel}>After</span>
                <div className={styles.orderChart}>
                  {[60, 70, 80, 90, 100, 110, 120].map((h, i) => (
                    <div key={i} className={styles.orderBar} style={{ height: h }} />
                  ))}
                </div>
                <div className={styles.statusDot} style={{ background: 'var(--green)' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProblemSection;
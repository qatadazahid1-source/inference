import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './HowItWorks.module.css';

interface Step {
  num: string;
  title: string;
  body: string;
}

const steps: Step[] = [
  {
    num:'1',
    title:'Connect',
    body:'Paste your AI provider API keys. Cost data starts flowing in seconds. No engineering required.',
  },
  {
    num:'2',
    title:'Analyze',
    body:'Dashboard fills with real-time data — organized by team, project, and model automatically.',
  },
  {
    num:'3',
    title:'Optimize',
    body:'Set budgets, get alerts, generate board-ready ROI reports in one click.',
  },
];

const HowItWorks: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <span className={styles.label}>HOW IT WORKS</span>
        <h2 className={styles.headline}>
          Up and running in 10 minutes.
        </h2>
        <p className={styles.sub}>
          Three simple steps to complete visibility into your AI spend.
        </p>

        <div className={styles.steps}>
          {steps.map((step) => (
            <div key={step.num} className={styles.step}>
              <div className={styles.stepCircle}>
                <span className={styles.stepNum}>{step.num}</span>
              </div>
              <h3 className={styles.stepTitle}>{step.title}</h3>
              <p className={styles.stepBody}>{step.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
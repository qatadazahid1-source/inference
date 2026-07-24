import React from 'react';
import { Link } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './FinalCTA.module.css';

const FinalCTA: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.glow} />
      
      <div className={styles.container}>
        <span className={styles.label}>GET STARTED</span>
        <h2 className={styles.headline}>
          Stop guessing.<br />
          <span className={styles.gradientText}>Start knowing.</span>
        </h2>
        <p className={styles.sub}>
          Join 450+ enterprises already saving 32% on AI costs.
        </p>

        <div className={styles.ctaRow}>
          <Link to="/signup" className={styles.btnPrimary}>
            Start Free Trial
          </Link>
          <a href="#" className={styles.btnGhost}>
            Talk to Sales
          </a>
        </div>

        <div className={styles.proofs}>
          <div className={`${styles.proofCard} ${styles.left}`}>
            <span className={styles.proofIcon}>★</span>
            <span className={styles.proofText}>G2: 4.9/5</span>
          </div>
          <div className={`${styles.proofCard} ${styles.right}`}>
            <span className={styles.proofIcon}>🏆</span>
            <span className={styles.proofText}>Product Hunt #1</span>
          </div>
          <div className={`${styles.proofCard} ${styles.bottom}`}>
            <span className={styles.proofIcon}>⚡</span>
            <span className={styles.proofText}>Avg setup: 8 min</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FinalCTA;
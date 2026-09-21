import React from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingNav.module.css';

export const LandingNav: React.FC = () => {
  return (
    <nav className={styles.nav} aria-label="Main Navigation">
      <Link to="/" className={styles.logo} aria-label="ORDISUM Home">
        <img src="/ordisum-logo.png" alt="ORDISUM" className={styles.logoImg} />
      </Link>

      <ul className={styles.links}>
        <li><Link to="/features">Features</Link></li>
        <li><Link to="/pricing">Pricing</Link></li>
        <li><Link to="/security">Security</Link></li>
        <li><Link to="/docs">Docs</Link></li>
      </ul>

      <div className={styles.actions}>
        <Link to="/auth/signin" className={styles.btnGhost}>Sign In</Link>
        <Link to="/auth/signup" className={styles.btnPrimary}>Get Started</Link>
      </div>
    </nav>
  );
};

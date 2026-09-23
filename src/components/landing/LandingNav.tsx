import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import styles from './LandingNav.module.css';

export const LandingNav: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMobileMenu = () => setIsMobileMenuOpen(!isMobileMenuOpen);
  
  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  // Prevent body scrolling when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isMobileMenuOpen]);

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
        <button 
          className={styles.hamburgerBtn} 
          onClick={toggleMobileMenu}
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMobileMenuOpen}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className={styles.mobileMenu}>
          <ul className={styles.mobileLinks}>
            <li><Link to="/features">Features</Link></li>
            <li><Link to="/pricing">Pricing</Link></li>
            <li><Link to="/security">Security</Link></li>
            <li><Link to="/docs">Docs</Link></li>
            <li><Link to="/auth/signin" className={styles.mobileBtnGhost}>Sign In</Link></li>
            <li><Link to="/auth/signup" className={styles.mobileBtnPrimary}>Get Started</Link></li>
          </ul>
        </div>
      )}
    </nav>
  );
};

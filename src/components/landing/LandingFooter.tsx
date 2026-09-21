import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './LandingFooter.module.css';

export const LandingFooter: React.FC = () => {
  const [siteLinks, setSiteLinks] = useState<any>({ product: [], company: [], legal: [], social: [] });

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/site-links')
      .then(res => res.json())
      .then(data => {
        if (!cancelled && data.data) {
          setSiteLinks(data.data);
        }
      })
      .catch(err => console.error('[LandingFooter] Failed to load site links:', err));
    return () => { cancelled = true; };
  }, []);

  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <Link to="/" className={styles.brandLogo}>
              <div className={styles.brandLogoMark}>O</div>
              <span className={styles.brandLogoText}>Ordisum</span>
            </Link>
            <p className={styles.brandDescription}>
              Real-time AI API cost management, token telemetry, and automated budget enforcement for enterprise infrastructure.
            </p>
          </div>

          <div>
            <div className={styles.colTitle}>Product</div>
            <ul className={styles.colLinks}>
              {siteLinks.product?.length > 0 ? (
                siteLinks.product.map((link: any) => (
                  <li key={link.id}>
                    <a href={link.url}>{link.label}</a>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/features">Features</Link></li>
                  <li><Link to="/pricing">Pricing</Link></li>
                  <li><Link to="/security">Security</Link></li>
                  <li><Link to="/docs">Documentation</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <div className={styles.colTitle}>Company</div>
            <ul className={styles.colLinks}>
              {siteLinks.company?.length > 0 ? (
                siteLinks.company.map((link: any) => (
                  <li key={link.id}>
                    <a href={link.url}>{link.label}</a>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/about">About</Link></li>
                  <li><Link to="/blog">Blog</Link></li>
                  <li><Link to="/contact-sales">Contact</Link></li>
                </>
              )}
            </ul>
          </div>

          <div>
            <div className={styles.colTitle}>Legal</div>
            <ul className={styles.colLinks}>
              {siteLinks.legal?.length > 0 ? (
                siteLinks.legal.map((link: any) => (
                  <li key={link.id}>
                    <a href={link.url}>{link.label}</a>
                  </li>
                ))
              ) : (
                <>
                  <li><Link to="/privacy-policy">Privacy Policy</Link></li>
                  <li><Link to="/terms">Terms of Service</Link></li>
                  <li><Link to="/refund-policy">Refund Policy</Link></li>
                </>
              )}
            </ul>
          </div>
        </div>

        <div className={styles.bottom}>
          <span className={styles.copyright}>
            © {new Date().getFullYear()} Ordisum. All rights reserved.
          </span>
          <div className={styles.socials}>
            {siteLinks.social?.length > 0 ? (
              siteLinks.social.map((link: any) => (
                <a key={link.id} href={link.url} className={styles.socialLink} target="_blank" rel="noopener noreferrer">
                  {link.label}
                </a>
              ))
            ) : (
              <>
                <a href="https://github.com" className={styles.socialLink} target="_blank" rel="noopener noreferrer">GitHub</a>
                <a href="https://twitter.com" className={styles.socialLink} target="_blank" rel="noopener noreferrer">Twitter</a>
                <a href="https://linkedin.com" className={styles.socialLink} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              </>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

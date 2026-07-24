import React, { useEffect, useState } from 'react';
import styles from './Footer.module.css';

// Inline SVGs — avoids depending on exact icon names/exports in the
// installed lucide-react version, which has removed/renamed a few of
// these (e.g. Twitter → X in newer releases).
const LinkedinIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14zM7.12 20.45H3.56V9h3.56v11.45z"/>
  </svg>
);

const XIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.9 2H22l-7.2 8.24L23 22h-6.9l-5.4-6.8L4.6 22H1.5l7.7-8.8L1 2h7l4.9 6.2L18.9 2zm-1.2 18h1.9L6.4 4h-2l13.3 16z"/>
  </svg>
);

const GithubIcon = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.57.1.78-.25.78-.55v-2.17c-3.2.7-3.87-1.36-3.87-1.36-.53-1.34-1.29-1.7-1.29-1.7-1.06-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.73-1.56-2.55-.29-5.24-1.28-5.24-5.68 0-1.25.45-2.28 1.19-3.08-.12-.29-.51-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.21-1.49 3.18-1.18 3.18-1.18.63 1.59.23 2.76.12 3.05.74.8 1.19 1.83 1.19 3.08 0 4.41-2.7 5.38-5.27 5.67.42.36.78 1.07.78 2.16v3.2c0 .31.21.66.79.55A10.51 10.51 0 0 0 23.5 12c0-6.35-5.15-11.5-11.5-11.5z"/>
  </svg>
);

interface SiteLink {
  id: string;
  label: string;
  url: string;
}

interface GroupedLinks {
  product: SiteLink[];
  company: SiteLink[];
  legal: SiteLink[];
  social: SiteLink[];
}

const EMPTY: GroupedLinks = { product: [], company: [], legal: [], social: [] };

const SOCIAL_ICON: Record<string, React.ReactNode> = {
  linkedin: <LinkedinIcon size={16} />,
  'x (twitter)': <XIcon size={16} />,
  twitter: <XIcon size={16} />,
  x: <XIcon size={16} />,
  github: <GithubIcon size={16} />,
};

function socialIconFor(label: string) {
  return SOCIAL_ICON[label.toLowerCase()] ?? <LinkedinIcon size={16} />;
}

const Footer: React.FC = () => {
  const [links, setLinks] = useState<GroupedLinks>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/site-links')
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && body?.data) setLinks(body.data);
      })
      .catch((err) => console.error('[Footer] Failed to load site links:', err));
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { heading: 'Product', links: links.product },
    { heading: 'Company', links: links.company },
    { heading: 'Legal', links: links.legal },
  ];

  return (
    <footer className={styles.footer}>
      <div className={styles.container}>
        <div className={styles.top}>
          <div className={styles.brand}>
            <a href="#" className={styles.logo}>
              <span className={styles.logoIcon}>
                <span className={styles.logoInner} />
              </span>
              Inference Intelligence
            </a>
            <p className={styles.tagline}>
              Every AI invoice, reconciled into one clear number.
            </p>
            {links.social.length > 0 && (
              <div className={styles.social}>
                {links.social.map((link) => (
                  <a
                    key={link.id}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.socialLink}
                    aria-label={link.label}
                  >
                    {socialIconFor(link.label)}
                  </a>
                ))}
              </div>
            )}
          </div>

          {columns.map((col) => (
            col.links.length > 0 && (
              <div key={col.heading} className={styles.column}>
                <h4 className={styles.columnHeading}>{col.heading}</h4>
                <ul className={styles.columnLinks}>
                  {col.links.map((link) => (
                    <li key={link.id}>
                      <a href={link.url} className={styles.columnLink}>
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ))}
        </div>

        <div className={styles.bottom}>
          <p className={styles.copyright}>
            © {new Date().getFullYear()} Inference Intelligence. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
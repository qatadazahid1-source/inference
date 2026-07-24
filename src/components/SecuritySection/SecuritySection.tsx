import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './SecuritySection.module.css';

// Consistent line icons — same visual language as FeaturesSection/
// ROICalculator, replacing the mismatched emoji set.
const Icon = {
  badge: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lock: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" strokeLinecap="round" />
    </svg>
  ),
  connection: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 2v6M12 16v6M4.9 4.9l4.2 4.2M14.9 14.9l4.2 4.2M2 12h6M16 12h6M4.9 19.1l4.2-4.2M14.9 9.1l4.2-4.2" strokeLinecap="round" />
    </svg>
  ),
  key: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12l9-9M17 6l3 3M14 9l2 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  globe: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" strokeLinecap="round" />
    </svg>
  ),
  scan: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 8V5a1 1 0 0 1 1-1h3M20 8V5a1 1 0 0 0-1-1h-3M4 16v3a1 1 0 0 0 1 1h3M20 16v3a1 1 0 0 1-1 1h-3" strokeLinecap="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

interface SecurityItem {
  icon: keyof typeof Icon;
  title: string;
  body: string;
}

// NOTE: keep these claims accurate to your actual posture — SOC 2 status,
// pen-testing cadence, and compliance scope are the kind of statements
// that create real liability if published while untrue. Verify each line
// against reality (or your admin-editable trust page) before shipping.
const items: SecurityItem[] = [
  { icon: 'badge', title: 'SOC 2 Type II', body: 'Certification in progress, with an annual third-party security audit.' },
  { icon: 'lock', title: 'AES-256 Encryption', body: 'Data encrypted at rest using AES-256.' },
  { icon: 'connection', title: 'TLS 1.3 in Transit', body: 'Every connection is secured with TLS 1.3.' },
  { icon: 'key', title: 'Zero-Knowledge API Keys', body: 'Your provider API keys are never stored in plaintext.' },
  { icon: 'globe', title: 'GDPR & CCPA', body: 'Data residency options available in the US, EU, and APAC.' },
  { icon: 'scan', title: 'Annual Penetration Testing', body: 'Independent penetration testing conducted annually.' },
];

const SecuritySection: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <span className={styles.label}>Security</span>
        <h2 className={styles.headline}>Enterprise-grade security, by default</h2>

        <div className={styles.grid}>
          {items.map((item) => (
            <div key={item.title} className={styles.card}>
              <div className={styles.iconWrap}>{Icon[item.icon]}</div>
              <h3 className={styles.title}>{item.title}</h3>
              <p className={styles.body}>{item.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SecuritySection;

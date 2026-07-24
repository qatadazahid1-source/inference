import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './FeaturesSection.module.css';

// Simple, consistent line-icon set — no emoji, no external icon package
// dependency (avoids the lucide-react version mismatch issue).
const Icon = {
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 19V9M11 19V5M18 19v-6" strokeLinecap="round" />
    </svg>
  ),
  calc: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h2M12 11h2M16 11h0M8 15h2M12 15h2M16 15h0" strokeLinecap="round" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 4a5 5 0 0 0-5 5v3.6L5 16h14l-2-3.4V9a5 5 0 0 0-5-5Z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M10 19a2 2 0 0 0 4 0" strokeLinecap="round" />
    </svg>
  ),
  doc: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3h9l3 3v15H6z" strokeLinejoin="round" />
      <path d="M15 3v3h3M9 12h6M9 15h6M9 18h4" strokeLinecap="round" />
    </svg>
  ),
  shield: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  trend: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 15l5-5 4 4 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 7h5v5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  plug: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M9 3v6M15 3v6M6 9h12v3a6 6 0 0 1-12 0z" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 18v3" strokeLinecap="round" />
    </svg>
  ),
};

interface Feature {
  icon: keyof typeof Icon;
  title: string;
  body: string;
  colSpan: number;
  hasMiniChart?: boolean;
  hasMiniDoc?: boolean;
  pills?: string[];
}

const features: Feature[] = [
  {
    icon: 'chart',
    title: 'Real-Time Cost Tracking',
    body: 'See exactly what you\u2019re spending on AI across every provider — updated every 5 minutes, broken down by team, project, and model.',
    colSpan: 7,
    hasMiniChart: true,
  },
  {
    icon: 'calc',
    title: 'ROI Calculation Engine',
    body: 'Time saved × hourly rate − AI cost, calculated automatically. Board-ready ROI, no spreadsheet required.',
    colSpan: 5,
  },
  {
    icon: 'bell',
    title: 'Smart Budget Alerts',
    body: 'Custom thresholds at 50/75/90/100%, delivered to Slack, email, or SMS before costs spiral.',
    colSpan: 5,
  },
  {
    icon: 'doc',
    title: 'Executive Reports',
    body: 'Board-ready exports that justify your AI strategy with real numbers, not estimates.',
    colSpan: 7,
    hasMiniDoc: true,
  },
  {
    icon: 'shield',
    title: 'Enterprise Security',
    body: 'Your API keys are encrypted at rest with AES-256 and never leave your environment.',
    colSpan: 4,
  },
  {
    icon: 'trend',
    title: 'Productivity Metrics',
    body: 'Time saved, automation rate, and error reduction — tied to real usage, not surveys.',
    colSpan: 4,
  },
  {
    icon: 'plug',
    title: '50+ Integrations',
    body: 'Connect your entire AI stack in minutes.',
    colSpan: 4,
    pills: ['OpenAI', 'Anthropic', 'Groq', 'Google', 'Cohere', 'Mistral'],
  },
];

const FeaturesSection: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section id="features" ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <span className={styles.label}>Features</span>
        <h2 className={styles.headline}>Everything you need to track AI ROI</h2>

        <div className={styles.grid}>
          {features.map((feature, i) => (
            <div
              key={i}
              className={styles.card}
              style={{ gridColumn: `span ${feature.colSpan}` }}
            >
              <div className={styles.iconWrap}>{Icon[feature.icon]}</div>
              <h3 className={styles.cardTitle}>{feature.title}</h3>
              <p className={styles.cardBody}>{feature.body}</p>

              {feature.hasMiniChart && (
                <div className={styles.miniChart}>
                  {[40, 65, 45, 80, 55, 90, 70, 50, 85].map((h, j) => (
                    <div key={j} className={styles.miniBar} style={{ height: h }} />
                  ))}
                </div>
              )}

              {feature.hasMiniDoc && (
                <div className={styles.miniDoc}>
                  <div className={styles.docHeader} />
                  <div className={styles.docLine} style={{ width: '80%' }} />
                  <div className={styles.docLine} style={{ width: '60%' }} />
                  <div className={styles.docLine} style={{ width: '90%' }} />
                </div>
              )}

              {feature.pills && (
                <div className={styles.pills}>
                  {feature.pills.map((pill) => (
                    <span key={pill} className={styles.pill}>{pill}</span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
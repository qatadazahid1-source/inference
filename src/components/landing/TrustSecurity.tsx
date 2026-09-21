import React from 'react';
import { Lock, EyeOff, ShieldCheck, Cpu } from 'lucide-react';
import styles from './TrustSecurity.module.css';

export const TrustSecurity: React.FC = () => {
  const items = [
    {
      icon: <Lock size={20} />,
      title: 'AES-256 Key Encryption',
      text: 'All provider API keys are encrypted at rest using AES-256-GCM. Secret values are never exposed in logs or front-end bundles.'
    },
    {
      icon: <EyeOff size={20} />,
      title: 'Zero Prompt Content Storage',
      text: 'Ordisum processes metadata only (token counts, latency, timestamps, and cost). Your prompt and completion payloads pass through uninhibited.'
    },
    {
      icon: <ShieldCheck size={20} />,
      title: 'Scoped Key Permissions',
      text: 'Provision gateway keys with granular model, spending, and rate limit boundaries. Instantly revoke compromised keys without breaking production.'
    },
    {
      icon: <Cpu size={20} />,
      title: 'Minimal-Overhead Edge Architecture',
      text: 'Our proxy gateway introduces negligible overhead to your API requests, ensuring telemetry collection never compromises model latency.'
    }
  ];

  return (
    <section className={styles.section} id="security">
      <div className={styles.header}>
        <h2 className={styles.title}>Engineered for strict enterprise data handling</h2>
      </div>

      <div className={styles.grid}>
        {items.map((item, idx) => (
          <div key={idx} className={styles.card}>
            <div className={styles.icon}>{item.icon}</div>
            <h3 className={styles.cardTitle}>{item.title}</h3>
            <p className={styles.cardText}>{item.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, buildFAQPage, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './UseCases.module.css';

export default function BudgetManagement() {
  const seoTitle = 'AI Budget Management | Ordisum';
  const seoDescription = 'Stop AI budget overruns before they happen. Hard limits that block requests, threshold alerts, and anomaly detection — all configurable per team or project.';
  const canonical = `${SITE_URL}/use-cases/ai-budget-management`;

  const faqData = [
    {
      question: 'What happens exactly when the budget is hit?',
      answer: 'Requests are blocked/throttled before exceeding the limit. The calling app receives a clear error response — not a silent drop.'
    },
    {
      question: 'Can different teams have different budget limits?',
      answer: 'Yes — limits are configurable per team and per project.'
    },
    {
      question: 'What counts as an anomaly?',
      answer: 'Hourly spend exceeding 3× the trailing 7-day average for that hour.'
    },
    {
      question: 'Can I set a warning threshold below the hard limit?',
      answer: 'Yes — threshold alerts at 50%/75%/90% fire before the limit is reached.'
    }
  ];

  const jsonLd = useMemo(() => {
    const webPage = buildWebPage({
      canonical,
      name: seoTitle,
      description: seoDescription,
    });
    const faqSchema = buildFAQPage(faqData, canonical);
    
    return buildGraph([
      buildOrganization({ description: seoDescription }),
      buildWebSite({ description: seoDescription }),
      webPage,
      faqSchema
    ]);
  }, [seoDescription, canonical, seoTitle, faqData]);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={seoTitle} description={seoDescription} canonical={canonical} jsonLd={jsonLd} />
      <LandingNav />
      
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>AI Budget Management: Enforce Limits, Don't Just Set Them</h1>
        </div>

        <section className={styles.section}>
          <h2>The Pain Point</h2>
          <p>You set up an alert for when spend hits 80% of your monthly budget. One Thursday afternoon, a retry loop runs for four hours. The alert fires at 9pm. By then you've spent 140% of your monthly budget.</p>
          <p>Alerts don't prevent overruns. They document them.</p>
        </section>

        <section className={styles.section}>
          <h2>The Solution</h2>
          <p>Ordisum's budget enforcement blocks requests before they exceed the limit you set. You define a monthly or quarterly cap — at the account level, the team level, or the project level. When that cap is reached, the next request gets a clear error response rather than being processed and added to the bill. The dashboard shows what happened and why.</p>
          <p>On top of hard limits: threshold alerts fire at 50%, 75%, 90%, and 100% of budget via Email, Slack, or SMS. Anomaly detection runs separately and fires when hourly spend exceeds 3× your trailing 7-day average — the pattern that usually indicates a bad deploy or a runaway loop.</p>
        </section>

        <section className={styles.section}>
          <h2>The Workflow</h2>
          <ol className={styles.workflowList}>
            <li>In the Ordisum dashboard, set a monthly or quarterly budget for your account, a team, or a specific project.</li>
            <li>Configure alert channels (Email, Slack, SMS) and which thresholds should trigger each.</li>
            <li>Enable anomaly detection to catch hour-level spikes without setting a specific alert rule.</li>
            <li>Ordisum enforces the limit automatically from that point forward — no manual monitoring required.</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>The Benefits</h2>
          <p>No more end-of-month surprise invoices. Engineering teams can deploy without finance needing to approve every feature. Anomalies surface within the hour, not at billing time.</p>
        </section>

        <section className={styles.section}>
          <h2>FAQ</h2>
          <div className={styles.faqList}>
            {faqData.map((item, idx) => (
              <div key={idx}>
                <h3>{item.question}</h3>
                <p>{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <div className={styles.cta}>
          <p>
            <Link to="/auth/signup" className="btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', display: 'inline-block', marginRight: '1rem' }}>Set a hard budget limit in 5 minutes</Link>
          </p>
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <Link to="/features">Features</Link> · <Link to="/docs/budget-alerts">Budget Alerts Docs</Link> · <Link to="/alternatives/helicone">How Ordisum differs from alert-only tools</Link>
          </p>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}

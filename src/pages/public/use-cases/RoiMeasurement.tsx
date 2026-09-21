import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, buildFAQPage, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './UseCases.module.css';

export default function RoiMeasurement() {
  const seoTitle = 'AI ROI Calculator | Ordisum';
  const seoDescription = 'Turn your tracked AI spend into a defensible ROI figure for finance or leadership — using your real usage data and published productivity benchmarks.';
  const canonical = `${SITE_URL}/use-cases/ai-roi-measurement`;

  const faqData = [
    {
      question: 'What data does the calculation use?',
      answer: 'Your real tracked spend from the Ordisum dashboard, combined with team size, hourly rate, and time-savings inputs you provide.'
    },
    {
      question: 'Do the productivity benchmarks apply to my specific use case?',
      answer: 'The benchmarks are general estimates drawn from research across a range of AI use cases. The ROI figure is a starting point for the conversation, not a precise audit.'
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
          <h1 className={styles.title}>Measuring AI ROI: A Number You Can Actually Bring to a Budget Meeting</h1>
        </div>

        <section className={styles.section}>
          <h2>The Pain Point</h2>
          <p>An AI budget got approved six months ago. Now it's budget review time, and someone asks: "Was it worth it?"</p>
          <p>The honest answer for most teams is: "We think so, but we can't prove it." You have a dollar figure on what you spent. You don't have a clear framework connecting that spend to what it produced.</p>
        </section>

        <section className={styles.section}>
          <h2>The Solution</h2>
          <p>Ordisum's ROI Calculator takes three inputs alongside your tracked spend:</p>
          <ul className={styles.workflowList}>
            <li>Team size</li>
            <li>Average hourly rate</li>
            <li>Estimate of time savings per week</li>
          </ul>
          <p>It multiplies those against the productivity benchmarks from published research on AI productivity impact — the kind of numbers that hold up in a finance conversation because they came from named studies, not internal guesswork — and outputs a ROI figure.</p>
          <p>That output is a calculation, not a claim. You can audit every step of it.</p>
        </section>

        <section className={styles.section}>
          <h2>Who benefits most</h2>
          <p>Engineering managers who need to justify renewing an AI tooling budget. CTOs presenting AI spend to a board. Finance teams trying to make sense of an AI line item that keeps growing.</p>
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
            <Link to="/auth/signup" className="btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', display: 'inline-block', marginRight: '1rem' }}>Calculate your AI ROI with real data</Link>
          </p>
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <Link to="/features">Features</Link> · <Link to="/docs/roi-calculator">ROI Calculator Docs</Link>
          </p>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}

import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './Alternatives.module.css';

export default function LiteLLM() {
  const seoTitle = 'Ordisum vs. LiteLLM: Managed Enforcement vs. Self-Hosted Proxy';
  const seoDescription = 'LiteLLM is an open-source self-hosted proxy. Ordisum is managed and built around hard budget enforcement and ROI reporting from day one.';
  const canonical = `${SITE_URL}/alternatives/litellm`;

  const jsonLd = useMemo(() => {
    const webPage = buildWebPage({
      canonical,
      name: seoTitle,
      description: seoDescription,
    });
    
    return buildGraph([
      buildOrganization({ description: seoDescription }),
      buildWebSite({ description: seoDescription }),
      webPage
    ]);
  }, [seoDescription, canonical, seoTitle]);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo title={seoTitle} description={seoDescription} canonical={canonical} jsonLd={jsonLd} />
      <LandingNav />
      
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>Ordisum vs. LiteLLM: The Self-Host Option vs. The Managed Enforcement Option</h1>
          <p className={styles.intro}>LiteLLM is a popular open-source proxy for teams with DevOps capacity who want a self-hosted gateway with zero platform fees. It does a lot — multi-provider routing, spend tracking, budget rules — if you're willing to build and maintain the layer yourself. Ordisum is managed. You don't host it. Budget enforcement and ROI reporting work on day one without building anything.</p>
        </div>

        <section className={styles.section}>
          <h2>Where Ordisum Is Different</h2>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>LiteLLM</th>
                <th>Ordisum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Hosting</td>
                <td>Self-hosted</td>
                <td>Managed</td>
              </tr>
              <tr>
                <td>Platform fee</td>
                <td>None, but ops overhead</td>
                <td>Paid plan</td>
              </tr>
              <tr>
                <td>Budget enforcement</td>
                <td>Configurable but requires setup</td>
                <td>Built-in, works at signup</td>
              </tr>
              <tr>
                <td>ROI Calculator</td>
                <td>Not offered</td>
                <td>Built in</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>Who Should Use Each</h2>
          <p>Use LiteLLM if you have the engineering bandwidth to run and maintain your own gateway, want zero platform cost, and are comfortable building the reporting and enforcement layers yourself.</p>
          <p>Use Ordisum if you want budget enforcement and cost attribution working immediately, managed, without standing up and maintaining infrastructure.</p>
        </section>

        <div className={styles.cta}>
          <p>
            <Link to="/auth/signup" className="btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', display: 'inline-block', marginRight: '1rem' }}>Start Free Trial</Link>
            <Link to="/use-cases/ai-budget-management" style={{ display: 'inline-block', marginTop: '1rem' }}>See how budget enforcement works →</Link>
          </p>
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
            Compare more features: <Link to="/features">Features</Link> · <Link to="/security">Security</Link>
          </p>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}

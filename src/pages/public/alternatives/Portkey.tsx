import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './Alternatives.module.css';

export default function Portkey() {
  const seoTitle = 'Ordisum vs. Portkey: Cost Enforcement vs. Multi-Provider Routing';
  const seoDescription = 'Portkey handles multi-provider routing and fallback chains. Ordisum handles budget enforcement and AI ROI. See which fits your team\'s actual need.';
  const canonical = `${SITE_URL}/alternatives/portkey`;

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
          <h1 className={styles.title}>Ordisum vs. Portkey: Routing vs. Enforcement</h1>
          <p className={styles.intro}>Portkey positions itself as a control plane for production AI — multi-provider routing, fallback chains, guardrails, and observability bundled together. If your main need is routing requests across providers for reliability or cost optimization at the call level, Portkey is built for that. If your main need is stopping your monthly bill from exceeding a set limit, Ordisum is built for that.</p>
        </div>

        <section className={styles.section}>
          <h2>Where Ordisum Is Different</h2>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Portkey</th>
                <th>Ordisum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Core focus</td>
                <td>Multi-provider routing + guardrails</td>
                <td>Budget enforcement + ROI</td>
              </tr>
              <tr>
                <td>Budget enforcement</td>
                <td>Rate limits / Alerts</td>
                <td>Hard limits, request-level blocking</td>
              </tr>
              <tr>
                <td>ROI Calculator</td>
                <td>Not offered</td>
                <td>Built in</td>
              </tr>
              <tr>
                <td>Integration surface</td>
                <td>SDK or Gateway API</td>
                <td>Base-URL swap</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>Who Should Use Each</h2>
          <p>Use Portkey if you need sophisticated request routing — sending traffic to different models or providers based on cost, latency, or availability, with automatic failover.</p>
          <p>Use Ordisum if you need spend to stay under a number you set, with enforcement rather than just visibility, and a way to report that spend as business value to people outside engineering.</p>
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

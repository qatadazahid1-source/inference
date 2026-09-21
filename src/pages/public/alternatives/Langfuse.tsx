import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './Alternatives.module.css';

export default function Langfuse() {
  const seoTitle = 'Ordisum vs. Langfuse: Financial Control vs. Output Evaluation';
  const seoDescription = 'Langfuse is built for LLM tracing and evaluation. Ordisum is built for budget enforcement and AI ROI. Here\'s the honest difference.';
  const canonical = `${SITE_URL}/alternatives/langfuse`;

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
          <h1 className={styles.title}>Ordisum vs. Langfuse: They're Solving Different Problems</h1>
          <p className={styles.intro}>Langfuse is an open-source, self-hostable platform built for detailed LLM tracing and evaluation — strong for teams debugging agent behavior, tracking prompt versions, and scoring outputs. These are genuinely different jobs. Trace debugging and budget enforcement share a category name ("AI observability") but serve different buyers with different needs.</p>
        </div>

        <section className={styles.section}>
          <h2>What Langfuse Does Well</h2>
          <p>Langfuse covers the evaluation side of AI operations: span-level tracing for complex agent workflows, prompt management, SDK-based instrumentation across call sites, and self-hosting for teams that want to keep everything on their own infrastructure.</p>
        </section>

        <section className={styles.section}>
          <h2>Where Ordisum Is Different</h2>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Langfuse</th>
                <th>Ordisum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Core focus</td>
                <td>Tracing + evaluation</td>
                <td>Budget enforcement + ROI</td>
              </tr>
              <tr>
                <td>Hosting</td>
                <td>Self-hostable</td>
                <td>Managed</td>
              </tr>
              <tr>
                <td>Integration</td>
                <td>SDK-based</td>
                <td>Base-URL swap, no SDK</td>
              </tr>
              <tr>
                <td>Budget enforcement</td>
                <td>No</td>
                <td>Hard limits — requests blocked at threshold</td>
              </tr>
              <tr>
                <td>ROI Calculator</td>
                <td>Not offered</td>
                <td>Built in</td>
              </tr>
              <tr>
                <td>Prompt storage</td>
                <td>Stored for evaluation</td>
                <td>Never stored</td>
              </tr>
            </tbody>
          </table>
        </section>

        <section className={styles.section}>
          <h2>Who Should Use Each</h2>
          <p>Use Langfuse if you're debugging agent execution, need span-level tracing to understand why a multi-step workflow produced a wrong output, want prompt version management, and have the DevOps capacity to self-host.</p>
          <p>Use Ordisum if your primary need is controlling and attributing spend — stopping overruns before they happen, reporting ROI to non-technical stakeholders, and tracking cost across providers without adding SDK instrumentation to every call site.</p>
        </section>

        <section className={styles.section}>
          <h2>FAQ</h2>
          <div className={styles.faqList}>
            <div>
              <h3>Can I self-host Ordisum like Langfuse?</h3>
              <p>No, Ordisum is a fully managed cloud service to ensure the lowest possible latency for global gateway routing and high availability for budget enforcement.</p>
            </div>
            <div>
              <h3>Is Ordisum open source?</h3>
              <p>No, Ordisum is a proprietary managed platform.</p>
            </div>
          </div>
        </section>

        <div className={styles.cta}>
          <p>
            <Link to="/auth/signup" className="btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', display: 'inline-block', marginRight: '1rem' }}>Start Free Trial</Link>
            <Link to="/use-cases/ai-roi-measurement" style={{ display: 'inline-block', marginTop: '1rem' }}>See how ROI Measurement works →</Link>
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

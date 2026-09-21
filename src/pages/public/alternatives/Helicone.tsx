import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './Alternatives.module.css';

export default function Helicone() {
  const seoTitle = 'Ordisum vs. Helicone: An AI Cost Control Alternative';
  const seoDescription = 'Helicone is widely used for AI observability. If budget enforcement and ROI reporting are your main requirement, here\'s how Ordisum compares.';
  const canonical = `${SITE_URL}/alternatives/helicone`;

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
          <h1 className={styles.title}>Ordisum vs. Helicone: Two Different Jobs in the Same Category</h1>
          <p className={styles.intro}>Helicone is a proxy-based AI gateway with strong observability features — request logging, caching, and cost and latency tracking. Both Helicone and Ordisum track AI costs. The difference is what each does when you're about to exceed a budget.</p>
        </div>

        <section className={styles.section}>
          <h2>What Helicone Does Well</h2>
          <p>Helicone has a mature integration path, a straightforward proxy setup, and a large existing user base. It logs requests at the prompt level, supports caching to reduce repeat costs, and has a clean dashboard for understanding what's happened.</p>
        </section>

        <section className={styles.section}>
          <h2>Where Ordisum Is Different</h2>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Feature</th>
                <th>Helicone</th>
                <th>Ordisum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Budget enforcement</td>
                <td>Alert-based</td>
                <td>Requests blocked before limit is exceeded</td>
              </tr>
              <tr>
                <td>ROI reporting</td>
                <td>Not offered</td>
                <td>Built-in ROI Calculator with team/hourly inputs</td>
              </tr>
              <tr>
                <td>Prompt logging</td>
                <td>Yes</td>
                <td>No — prompts never stored</td>
              </tr>
              <tr>
                <td>Integration</td>
                <td>Proxy swap</td>
                <td>Base-URL swap, same approach</td>
              </tr>
              <tr>
                <td>2FA</td>
                <td>Yes</td>
                <td>TOTP available</td>
              </tr>
            </tbody>
          </table>

          <p><strong>Hard limits:</strong> Ordisum doesn't just alert you when you hit your budget — it stops the next request from going through. That's the practical difference between knowing overspend happened and preventing it.</p>
          <p><strong>ROI Calculator:</strong> Helicone doesn't include a structured way to convert spend into a business case. Ordisum's ROI Calculator takes your tracked spend and produces a ROI figure using team size, hourly rate, and productivity benchmarks.</p>
          <p><strong>Prompt privacy:</strong> Ordisum stores no prompt content. Only cost and usage metadata.</p>
        </section>

        <section className={styles.section}>
          <h2>Who Should Use Each</h2>
          <p>Use Helicone if you primarily need request-level logging, caching to reduce repeat costs, and a well-established proxy integration with a large community behind it.</p>
          <p>Use Ordisum if budget enforcement is your main concern — specifically the ability to stop spend before it exceeds a limit, not just get notified afterward — or if you need a structured way to report AI ROI to finance or leadership.</p>
        </section>

        <section className={styles.section}>
          <h2>FAQ</h2>
          <div className={styles.faqList}>
            <div>
              <h3>Does Helicone enforce hard budget limits?</h3>
              <p>Helicone primarily relies on rate limits and alerting mechanisms rather than strict pre-request budget blocking.</p>
            </div>
            <div>
              <h3>Does Ordisum store prompts like Helicone might?</h3>
              <p>No — Ordisum stores only cost and usage metadata. We deliberately avoid logging prompt payload data.</p>
            </div>
            <div>
              <h3>Can I use both?</h3>
              <p>Technically possible but redundant at the gateway layer. They'd compete for the same request routing.</p>
            </div>
          </div>
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

import React, { useMemo } from 'react';
import { Seo } from '../../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, buildFAQPage, ORG_ID } from '../../../lib/schema';
import { LandingNav } from '../../../components/landing/LandingNav';
import { LandingFooter } from '../../../components/landing/LandingFooter';
import { Link } from 'react-router-dom';
import styles from './UseCases.module.css';

export default function CostMonitoring() {
  const seoTitle = 'AI Cost Monitoring for Engineering Teams | Ordisum';
  const seoDescription = 'Track AI API spend per model, provider, team, and project in real time — one dashboard instead of five provider consoles.';
  const canonical = `${SITE_URL}/use-cases/ai-cost-monitoring`;

  const faqData = [
    {
      question: 'How often does the dashboard update?',
      answer: 'Every five minutes.'
    },
    {
      question: 'Can I see cost broken down by team?',
      answer: 'Yes — attribution includes team and project labels you configure.'
    },
    {
      question: 'Do you support all major providers?',
      answer: 'OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere.'
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
          <h1 className={styles.title}>AI Cost Monitoring: See Exactly What You're Spending and Why</h1>
        </div>

        <section className={styles.section}>
          <h2>The Pain Point</h2>
          <p>You ship a feature. It calls GPT-4o for some things, Claude for others, and Gemini Embeddings in the background. Three weeks later your OpenAI bill is 60% higher than expected. You open the OpenAI console. You open the Anthropic console. You open the Google Cloud billing page. You have three numbers that don't add up to a clear answer.</p>
          <p>That's not a monitoring problem, it's an attribution problem. You need to know which model, which team, and which workflow drove the change — not just the total.</p>
        </section>

        <section className={styles.section}>
          <h2>The Solution</h2>
          <p>Ordisum meters every request through its Gateway. Each request is logged with model name, provider, token count, cost, latency, and whatever team/project label you've configured. The dashboard shows that data updated every five minutes. You can drill from account-level total to provider to model to the specific team or project that drove a spike.</p>
        </section>

        <section className={styles.section}>
          <h2>The Workflow</h2>
          <ol className={styles.workflowList}>
            <li>Swap your app's API base URL to the Ordisum Gateway and use your Ordisum API key.</li>
            <li>Configure team and project labels in the dashboard.</li>
            <li>Your existing code keeps calling whatever model it was calling. Ordisum logs each call automatically.</li>
            <li>Check the dashboard when you need to understand a change, or set up alerts to be notified before you need to look.</li>
          </ol>
        </section>

        <section className={styles.section}>
          <h2>The Benefits</h2>
          <p>No per-provider console-hopping. Attribution to the team and feature that drove cost, not just the provider. Real-time data, not end-of-month summaries.</p>
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
            <Link to="/auth/signup" className="btn-primary" style={{ padding: '0.75rem 1.5rem', background: 'var(--color-primary)', color: '#fff', borderRadius: '4px', display: 'inline-block', marginRight: '1rem' }}>See your AI cost breakdown in under 5 minutes</Link>
          </p>
          <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
            <Link to="/features">See the dashboard feature</Link> · <Link to="/docs/dashboard">Dashboard Docs</Link> · <Link to="/docs/providers">Provider Docs</Link>
          </p>
        </div>
      </main>
      
      <LandingFooter />
    </div>
  );
}

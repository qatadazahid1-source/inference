import React, { useMemo } from 'react';
import { Seo } from '../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, ORG_ID } from '../../lib/schema';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingFooter } from '../../components/landing/LandingFooter';
import styles from './Features.module.css';

export default function Features() {
  const seoTitle = 'Features | Ordisum — AI Cost Tracking, Budget Enforcement & ROI';
  const seoDescription = 'Hard budget limits that block requests before they overspend, real-time multi-provider cost tracking, anomaly detection, ROI calculator, and an external API gateway — all in one platform.';
  const canonical = `${SITE_URL}/features`;

  const jsonLd = useMemo(() => {
    const webPage = buildWebPage({
      canonical,
      name: seoTitle,
      description: seoDescription,
    });
    
    const software = {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description: seoDescription,
      publisher: { '@id': ORG_ID },
    };

    return buildGraph([
      buildOrganization({ description: seoDescription }),
      buildWebSite({ description: seoDescription }),
      webPage,
      software
    ]);
  }, [seoDescription, canonical, seoTitle]);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <LandingNav />
      
      <main className={styles.main}>
        <div className={styles.hero}>
          <h1 className={styles.title}>See where your AI money is going. Then stop it from going where it shouldn't.</h1>
          <p className={styles.intro}>The gap most teams hit isn't that they don't have enough data. They have too much, from too many places, in formats that don't talk to each other. Ordisum pulls that into one place, adds budget enforcement that actually works, and gives finance a number they can use.</p>
        </div>

        <section className={styles.featureSection}>
          <h2>Unified Cost Dashboard</h2>
          <p>You call five AI providers. Each one shows you what you spent in its own format, on its own timeline. Ordisum normalizes all of that into one dashboard: per-model, per-provider breakdowns, updated every five minutes, organized by team and project so you know exactly who spent what.</p>
          <p><strong>Who this is for:</strong> Engineering leads who need to answer "what did this feature cost this week?" without opening three different billing consoles.</p>
          <p><strong>What it's not:</strong> A summary report that runs nightly. The data is live — if a deploy causes a cost spike at 2pm, you see it at 2:05pm.</p>
          <p><strong>→ Docs:</strong> <a href="/docs/dashboard">How to read the dashboard</a></p>
        </section>

        <section className={styles.featureSection}>
          <h2>Hard Budget Enforcement</h2>
          <p>An alert that fires after you've exceeded a budget is just documentation. Ordisum's budget limits are enforcement: set a monthly or quarterly cap, and requests are blocked before they push spend past it. The limit applies before the API call completes, not after the invoice arrives.</p>
          <p>You can set limits at the account level, the team level, or the project level. A team that runs a chatbot and a team that runs batch embeddings don't share the same budget ceiling unless you want them to.</p>
          <p><strong>What happens at the limit:</strong> Requests are throttled, not silently dropped. The calling application gets a clear response. The dashboard shows why.</p>
          <p><strong>→ Use case:</strong> <a href="/use-cases/ai-budget-management">How budget enforcement stops overruns</a></p>
          <p><strong>→ Docs:</strong> <a href="/docs/budget-alerts">Setting up budget alerts</a></p>
        </section>

        <section className={styles.featureSection}>
          <h2>Smart Alerts & Anomaly Detection</h2>
          <p><strong>Threshold alerts</strong> fire at 50%, 75%, 90%, and 100% of your set budget. Channels: Email, Slack, SMS. You choose which ones and who receives them.</p>
          <p><strong>Anomaly detection</strong> runs separately. It watches hourly spend against your trailing 7-day average. When an hour comes in at more than 3× that average — the pattern that usually means a bad deploy, a retry loop, or a runaway agent — it fires an alert. You find out within the hour, not at the end of the billing cycle.</p>
        </section>

        <section className={styles.featureSection}>
          <h2>ROI Calculator</h2>
          <p>Most AI budget conversations end with a number on an invoice and no answer to "was it worth it?" The ROI Calculator takes your actual tracked spend and combines it with team size, average hourly rate, and productivity benchmarks to produce a ROI figure you can bring to a review.</p>
          <p>The benchmarks are drawn from published research on AI productivity impact. The spend figures are the real ones from your dashboard, not estimates. The output isn't a claim — it's a calculation you can audit.</p>
          <p><strong>→ Use case:</strong> <a href="/use-cases/ai-roi-measurement">Measuring the real ROI of AI spend</a></p>
          <p><strong>→ Docs:</strong> <a href="/docs/roi-calculator">Using the ROI Calculator</a></p>
        </section>

        <section className={styles.featureSection}>
          <h2>External API Gateway</h2>
          <p>Third-party tools, internal scripts, and automations that call AI providers directly are invisible to most cost-tracking systems. The External API Gateway fixes that.</p>
          <p>Issue a read-only platform key (ii_sk_...) to any external caller. Their requests route through Ordisum, log against your dashboard with full token counts and cost attribution, and can be revoked instantly if something looks wrong. No code change on the caller's side.</p>
          <p><strong>→ Docs:</strong> <a href="/docs/api-auth">API authentication</a></p>
        </section>
      </main>
      
      <div style={{ marginTop: 'auto' }}>
        <LandingFooter />
      </div>
    </div>
  );
}

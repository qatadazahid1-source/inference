import React, { useMemo } from 'react';
import { Seo } from '../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, buildFAQPage, ORG_ID } from '../../lib/schema';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingFooter } from '../../components/landing/LandingFooter';
import { PricingSection } from '../../components/landing/PricingSection';
import styles from './Features.module.css'; // Reusing features CSS for consistency in layout

export default function Pricing() {
  const seoTitle = 'Pricing | Ordisum — Predictable Costs for AI Cost Management';
  const seoDescription = 'Start with a 14-day free trial. Predictable flat-rate pricing based on monthly tracked API spend. No seat limits, no hidden overage fees.';
  const canonical = `${SITE_URL}/pricing`;

  const faqData = [
    {
      question: 'Do I need a credit card for the trial?',
      answer: 'No. The 14-day trial requires no payment method. You get full access to budget enforcement, anomaly detection, and the ROI calculator.'
    },
    {
      question: 'What happens if my AI spend grows into the next tier?',
      answer: 'We don\'t cut off your service. If your trailing 30-day API spend exceeds your tier limit, we\'ll notify you and give you a grace period to upgrade to the next tier.'
    },
    {
      question: 'Are there seat limits?',
      answer: 'No. Cost visibility only works if the whole team can see it. Add as many developers, PMs, and finance team members as you need.'
    },
    {
      question: 'Does Ordisum charge a percentage of my AI spend?',
      answer: 'No. We charge a flat SaaS fee based on volume tiers. We are not incentivized to see your AI costs go up.'
    }
  ];

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

    const faqSchema = buildFAQPage(faqData, canonical);

    return buildGraph([
      buildOrganization({ description: seoDescription }),
      buildWebSite({ description: seoDescription }),
      webPage,
      software,
      faqSchema
    ]);
  }, [seoDescription, canonical, seoTitle, faqData]);

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
          <h1 className={styles.title}>Predictable pricing for unpredictable AI costs.</h1>
          <p className={styles.intro}>We built Ordisum to eliminate billing surprises, not add to them. You don't pay per seat, and you don't pay per token. You pay a flat rate based on the tier of API spend you need us to monitor and enforce.</p>
        </div>

        {/* Pricing Component from Landing Page */}
        <div style={{ margin: '4rem -2rem' }}>
          <PricingSection />
        </div>

        <section className={styles.featureSection} style={{ marginTop: '4rem' }}>
          <h2>Billing FAQ</h2>
          
          <div style={{ marginTop: '2rem' }}>
            {faqData.map((item, idx) => (
              <div key={idx} style={{ marginBottom: '2rem' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '0.75rem' }}>
                  {item.question}
                </h3>
                <p style={{ fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)' }}>
                  {item.answer}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
      
      <div style={{ marginTop: 'auto' }}>
        <LandingFooter />
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { Seo } from '../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../config/seo';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph, buildFAQPage, ORG_ID } from '../../lib/schema';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingFooter } from '../../components/landing/LandingFooter';
import styles from './Features.module.css';

export default function Security() {
  const seoTitle = 'Enterprise Security | Ordisum — Secure AI Gateway';
  const seoDescription = 'AES-256 encryption, zero prompt logging, and SOC2-compliant infrastructure. How Ordisum secures your AI API gateway and telemetry data.';
  const canonical = `${SITE_URL}/security`;

  const faqData = [
    {
      question: 'Can I self-host Ordisum?',
      answer: 'Not currently. Ordisum is a fully managed cloud service to ensure the lowest possible latency for global gateway routing and high availability for budget enforcement.'
    },
    {
      question: 'What cloud provider do you run on?',
      answer: 'Google Cloud Platform (GCP). Our gateway edges are globally distributed, and our primary telemetry databases are hosted in US-Central.'
    },
    {
      question: 'Are you HIPAA/SOC2 compliant?',
      answer: 'We run entirely on SOC2 and HIPAA compliant infrastructure (GCP/Supabase), but Ordisum itself has not yet completed a final SOC2 audit. Because we never store prompt or completion data, PHI/PII within your AI payloads never enters our databases.'
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
          <h1 className={styles.title}>Zero prompt storage. Total encryption.</h1>
          <p className={styles.intro}>A gateway sits in the critical path of your data. We built Ordisum on the principle that cost telemetry shouldn't require compromising data privacy.</p>
        </div>

        <section className={styles.featureSection}>
          <h2>API Key Encryption</h2>
          <p>When you save a provider API key (OpenAI, Anthropic, etc.) in Ordisum, it is encrypted at rest using AES-256-GCM. We use a dedicated Key Management Service (KMS). The plaintext key is never logged, never returned in API responses, and only decrypted in memory at the exact moment a gateway request needs to be signed.</p>
        </section>

        <section className={styles.featureSection}>
          <h2>Zero Prompt Logging</h2>
          <p>Ordisum is an observability and enforcement tool, not a data lake.</p>
          <p><strong>What we store:</strong> Token counts (prompt/completion), model name, provider, latency, timestamp, HTTP status, and the identifier of the key that made the request.</p>
          <p><strong>What we DO NOT store:</strong> The contents of your prompt. The contents of the completion. Your system instructions. Your embedding vectors.</p>
        </section>

        <section className={styles.featureSection}>
          <h2>Account Security</h2>
          <ul style={{ fontSize: '1.125rem', lineHeight: 1.6, color: 'var(--color-text-secondary)', paddingLeft: '1.5rem', marginBottom: '1rem' }}>
            <li style={{ marginBottom: '0.5rem' }}>Role-based access control (RBAC) separates billing admins from engineers generating keys.</li>
            <li style={{ marginBottom: '0.5rem' }}>Two-factor authentication (TOTP) supported for all accounts.</li>
            <li style={{ marginBottom: '0.5rem' }}>Audit logs available for key creation, revocation, and budget limit changes.</li>
          </ul>
        </section>

        <section className={styles.featureSection} style={{ marginTop: '4rem' }}>
          <h2>Security FAQ</h2>
          
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

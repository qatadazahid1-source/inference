import React, { useMemo } from 'react';
import { Seo } from '../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../config/seo';
import { LEGAL_CONFIG } from '../../config/legal';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph } from '../../lib/schema';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingFooter } from '../../components/landing/LandingFooter';
import staticStyles from '../StaticPage.module.css';

export default function PrivacyPolicy() {
  const seoTitle = `Privacy Policy — ${LEGAL_CONFIG.BRAND_NAME}`;
  const seoDescription = `Privacy Policy for ${LEGAL_CONFIG.BRAND_NAME}. Learn how we collect, use, and protect your data.`;
  const canonical = `${SITE_URL}/privacy-policy`;
  const lastUpdated = LEGAL_CONFIG.EFFECTIVE_DATE;

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
      <Seo
        title={seoTitle}
        description={seoDescription}
        canonical={canonical}
        jsonLd={jsonLd}
      />
      <LandingNav />
      
      <main className={staticStyles.page} style={{ flexGrow: 1, padding: '100px 24px 120px' }}>
        <div className={staticStyles.wrap}>
          <h1 className={staticStyles.title}>Privacy Policy</h1>
          <p className={staticStyles.updated}>Last updated {lastUpdated}</p>
          
          <div className={staticStyles.content}>
            <p>
              At {SITE_NAME}, accessible from {SITE_URL}, one of our main priorities is the privacy of our visitors. This Privacy Policy document outlines the types of information that is collected and recorded by {SITE_NAME} and how we use it.
            </p>

            <h2>Information We Collect</h2>
            <p>
              We collect information you provide directly to us, such as when you create an account, request customer support, or communicate with us.
            </p>
            <ul>
              <li><strong>Account Data:</strong> Name, email address, password hash, and organization details.</li>
              <li><strong>API Credentials:</strong> Read-only AI provider API keys, which are encrypted at rest using enterprise-grade AES-256 encryption.</li>
              <li><strong>Usage Data:</strong> We do <strong>NOT</strong> store your model prompts or completion payloads. We only store operational metadata (token counts, latency, cost attribution) required for analytics and budget management.</li>
            </ul>

            <h2>How We Use Information</h2>
            <p>We use the information we collect to:</p>
            <ul>
              <li>Provide, maintain, and improve our cost observability and management platform.</li>
              <li>Process billing transactions and enforce automated budget thresholds.</li>
              <li>Send technical alerts, security notices, and administrative messages.</li>
              <li>Detect and prevent security incidents and fraudulent activities.</li>
            </ul>

            <h2>Cookies and Local Storage</h2>
            <p>
              We use strictly necessary browser storage to maintain active authentication sessions. We do not use third-party advertising tracking cookies. If you opt into performance analytics, we use privacy-focused telemetry tools that anonymize visitor IP addresses.
            </p>

            <h2>Data Protection and Security</h2>
            <p>
              We implement industry-standard technical and organizational security measures to guard your data against unauthorized access, loss, or alteration. API keys and sensitive tokens are encrypted both in transit (TLS 1.3) and at rest.
            </p>

            <h2>Contact Us</h2>
            <p>
              If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact us at: <strong>{LEGAL_CONFIG.CONTACT_EMAIL}</strong>
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

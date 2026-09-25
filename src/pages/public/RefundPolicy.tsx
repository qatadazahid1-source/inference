import React, { useMemo } from 'react';
import { Seo } from '../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../config/seo';
import { LEGAL_CONFIG } from '../../config/legal';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph } from '../../lib/schema';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingFooter } from '../../components/landing/LandingFooter';
import staticStyles from '../StaticPage.module.css';

export default function RefundPolicy() {
  const seoTitle = `Refund Policy — ${LEGAL_CONFIG.BRAND_NAME}`;
  const seoDescription = `Refund Policy for ${LEGAL_CONFIG.BRAND_NAME} subscriptions. Information on our 14-day money-back guarantee and cancellation process.`;
  const canonical = `${SITE_URL}/refund-policy`;
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
          <h1 className={staticStyles.title}>Refund Policy</h1>
          <p className={staticStyles.updated}>Last updated {lastUpdated}</p>
          
          <div className={staticStyles.content}>
            <p>
              At {SITE_NAME}, we strive to provide the best possible service for managing your AI API costs.
            </p>

            <h2>14-Day Money-Back Guarantee</h2>
            <p>
              We offer a <strong>14-day money-back guarantee</strong> on all initial paid plan subscriptions. If you are not completely satisfied with our platform during the first 14 days of your subscription, you may request a full refund of your subscription fee.
            </p>

            <h2>How to Request a Refund</h2>
            <p>
              To request a refund within the 14-day window, please contact our support team at <strong>{LEGAL_CONFIG.CONTACT_EMAIL}</strong>. Please include your account email address and organization details in your request.
            </p>

            <h2>Cancellations and Renewal</h2>
            <p>
              You may cancel your subscription at any time through your account settings. Upon cancellation, your subscription will remain active until the end of your current billing cycle, and you will not be charged again. Refunds are not provided for partial billing periods after the initial 14-day window.
            </p>

            <h2>Enterprise Agreements</h2>
            <p>
              Custom enterprise billing plans and dedicated contracts are governed by the specific refund and cancellation terms outlined in their executed commercial service agreements.
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

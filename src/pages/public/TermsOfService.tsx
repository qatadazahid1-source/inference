import React, { useMemo } from 'react';
import { Seo } from '../../components/seo/Seo';
import { SITE_URL, SITE_NAME } from '../../config/seo';
import { LEGAL_CONFIG } from '../../config/legal';
import { buildOrganization, buildWebSite, buildWebPage, buildGraph } from '../../lib/schema';
import { LandingNav } from '../../components/landing/LandingNav';
import { LandingFooter } from '../../components/landing/LandingFooter';
import staticStyles from '../StaticPage.module.css';

export default function TermsOfService() {
  const seoTitle = 'Terms of Service | Ordisum';
  const seoDescription = 'Terms of Service and Acceptable Use Policy for Ordisum, an AI API cost management and observability platform.';
  const canonical = `${SITE_URL}/terms`;
  const lastUpdated = 'September 25, 2026';

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
          <h1 className={staticStyles.title}>Terms of Service</h1>
          <p className={staticStyles.updated}>Last updated {lastUpdated}</p>
          
          <div className={staticStyles.content}>
            <p>
              Welcome to {SITE_NAME} ("we," "our," or "us"). By accessing or using our website, services, and software platform (collectively, the "Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to these Terms, do not use the Service.
            </p>

            <h2 id="description-of-service">1. Description of the Service</h2>
            <p>
              {SITE_NAME} is an AI API cost management and observability platform. Our Service provides functionality including, but not limited to, AI API usage tracking, token usage telemetry, cost calculation, model/provider cost attribution, budget management, API gateway/proxy functionality, and usage analytics.
            </p>
            <p>
              We act as an intermediary software layer between your applications and third-party AI service providers. We do not provide the underlying AI models or generation services.
            </p>

            <h2 id="eligibility-and-registration">2. Eligibility and Account Registration</h2>
            <p>
              To use the Service, you must register for an account. By registering, you represent that you have the legal capacity to enter into a binding agreement. If you are using the Service on behalf of an organization, you represent that you have the authority to bind that organization to these Terms.
            </p>
            <p>
              You agree to provide accurate, current, and complete information during registration and to update such information to keep it accurate.
            </p>

            <h2 id="account-security">3. Account Security</h2>
            <p>
              You are responsible for safeguarding your account credentials, including passwords and API keys. You must promptly notify us of any unauthorized use of or access to your account. We are not liable for any loss or damage arising from your failure to protect your credentials.
            </p>

            <h2 id="third-party-providers">4. Third-Party AI Providers and Integrations</h2>
            <p>
              The Service requires you to connect or configure integrations with third-party AI providers (e.g., OpenAI, Anthropic, etc.). You acknowledge and agree that:
            </p>
            <ul>
              <li>You are solely responsible for maintaining your own accounts, API credentials, and billing relationships with these third-party providers.</li>
              <li>{SITE_NAME} does not control, and is not responsible for, the availability, performance, accuracy, or security of third-party AI provider services.</li>
              <li>Your use of third-party AI providers is governed strictly by their respective terms of service and acceptable use policies. You agree to comply with all such third-party terms.</li>
            </ul>

            <h2 id="api-usage-limits">5. API Usage and Rate Limits</h2>
            <p>
              While {SITE_NAME} provides budget enforcement and rate-limiting features to help you control your spending, we do not guarantee that our systems will perfectly prevent all overages, especially in cases of extreme concurrent traffic, sudden bursts, or latency in third-party reporting. You remain fully responsible for any charges incurred directly with your third-party AI providers.
            </p>

            <h2 id="subscriptions-and-billing">6. Subscriptions, Payments, and Taxes</h2>
            <p>
              <strong>Fees:</strong> Use of certain features requires a paid subscription. Pricing and plan details are presented on our website or during the checkout process. We reserve the right to change our pricing upon providing notice to you.<br />
              <strong>Billing:</strong> Subscriptions are billed in advance on a recurring basis. By providing a payment method, you authorize us (or our third-party payment processors, such as Lemon Squeezy) to charge the applicable fees.<br />
              <strong>Taxes:</strong> You are responsible for all applicable taxes associated with your purchase, which will be calculated and collected at checkout where required.<br />
              <strong>Enterprise Customers:</strong> Specific enterprise arrangements may be subject to separate commercial agreements and invoicing processes.
            </p>

            <h2 id="cancellation-and-refunds">7. Cancellation and Refunds</h2>
            <p>
              You may cancel your subscription at any time through your account settings. Cancellation will take effect at the end of your current billing cycle. Unless otherwise specified in our <a href="/refund-policy">Refund Policy</a> or required by law, all fees paid are non-refundable.
            </p>

            <h2 id="acceptable-use">8. Acceptable Use and Prohibited Activities</h2>
            <p>
              You agree not to:
            </p>
            <ul>
              <li>Use the Service for any illegal, fraudulent, or unauthorized purpose.</li>
              <li>Interfere with, disrupt, or attempt to gain unauthorized access to the Service, our servers, or our networks.</li>
              <li>Reverse engineer, decompile, or extract the source code of the Service.</li>
              <li>Use the Service to transmit malicious code, malware, or viruses.</li>
              <li>Bypass or attempt to circumvent any rate limits, budget enforcement, or security controls we implement.</li>
            </ul>

            <h2 id="customer-data-and-privacy">9. Customer Data and Privacy</h2>
            <p>
              Your privacy is important to us. Our collection, use, and handling of your data (including API keys, telemetry, and account information) is governed by our <a href="/privacy-policy">Privacy Policy</a>. 
            </p>
            <p>
              You retain all rights to the data and configurations you submit to the Service. By using the Service, you grant us a limited license to process and analyze this data solely for the purpose of providing, maintaining, and improving the Service.
            </p>

            <h2 id="intellectual-property">10. Intellectual Property</h2>
            <p>
              {SITE_NAME} and its original content, features, and functionality are owned by us and are protected by international copyright, trademark, and other intellectual property laws. You are granted a limited, non-exclusive, non-transferable license to use the Service in accordance with these Terms.
            </p>

            <h2 id="service-availability">11. Service Availability and Modifications</h2>
            <p>
              We strive to provide reliable service, but we do not guarantee uninterrupted or error-free operation. The Service may be temporarily unavailable for maintenance, updates, or due to factors outside our control. We reserve the right to modify, suspend, or discontinue any part of the Service at any time with or without notice.
            </p>

            <h2 id="disclaimers">12. Disclaimers</h2>
            <p>
              THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT GUARANTEE ANY SPECIFIC COST SAVINGS, ROI, OR FINANCIAL OUTCOMES FROM USING THE SERVICE.
            </p>

            <h2 id="limitation-of-liability">13. Limitation of Liability</h2>
            <p>
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, IN NO EVENT SHALL {SITE_NAME}, ITS DIRECTORS, EMPLOYEES, OR AFFILIATES BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, USE, OR GOODWILL, ARISING OUT OF OR IN CONNECTION WITH YOUR USE OF THE SERVICE, WHETHER BASED ON WARRANTY, CONTRACT, TORT (INCLUDING NEGLIGENCE), OR ANY OTHER LEGAL THEORY.
            </p>

            <h2 id="indemnification">14. Indemnification</h2>
            <p>
              You agree to defend, indemnify, and hold harmless {SITE_NAME} from and against any claims, liabilities, damages, judgments, awards, losses, costs, or expenses (including reasonable attorneys' fees) arising out of or relating to your violation of these Terms, your misuse of the Service, or your violation of any third-party provider's terms.
            </p>

            <h2 id="suspension-and-termination">15. Suspension and Termination</h2>
            <p>
              We reserve the right to suspend or terminate your account and access to the Service immediately, without prior notice or liability, for any reason, including but not limited to a breach of these Terms, failure to pay fees, or if your usage poses a security risk or operational threat to our systems.
            </p>

            <h2 id="governing-law">16. Governing Law</h2>
            <p>
              These Terms shall be governed by and construed in accordance with the applicable laws of the jurisdiction in which we operate, without regard to its conflict of law provisions. Any disputes arising under these Terms shall be subject to the exclusive jurisdiction of the competent courts in that jurisdiction.
            </p>

            <h2 id="changes-to-terms">17. Changes to These Terms</h2>
            <p>
              We may update these Terms from time to time. If we make material changes, we will notify you by updating the "Last updated" date at the top of this page, and we may also provide notice through the Service or via email. Your continued use of the Service after any changes constitutes your acceptance of the new Terms.
            </p>

            <h2 id="contact-us">18. Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: <strong>{LEGAL_CONFIG.CONTACT_EMAIL}</strong>
            </p>
          </div>
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}

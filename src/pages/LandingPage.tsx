import React, { useState, useEffect, useMemo } from 'react';
import { Seo } from '../components/seo/Seo';
import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION } from '../config/seo';
import {
  buildOrganization,
  buildWebSite,
  buildWebPage,
  buildGraph,
  buildFAQPage,
  ORG_ID,
} from '../lib/schema';

import { LandingNav } from '../components/landing/LandingNav';
import { Hero } from '../components/landing/Hero';
import { ProductPreview } from '../components/landing/ProductPreview';
import { CostVisibility } from '../components/landing/CostVisibility';
import { UsageObservability } from '../components/landing/UsageObservability';
import { DeveloperExperience } from '../components/landing/DeveloperExperience';
import { PricingSection } from '../components/landing/PricingSection';
import { TrustSecurity } from '../components/landing/TrustSecurity';
import { LandingFaq, FAQ_DATA } from '../components/landing/LandingFaq';
import { FinalCTA } from '../components/landing/FinalCTA';
import { LandingFooter } from '../components/landing/LandingFooter';
import { ProblemSection } from '../components/landing/ProblemSection';
import { FeatureSummaries } from '../components/landing/FeatureSummaries';

interface HomeSeo {
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
  robots?: string | null;
}

export default function LandingPage() {
  const [homeSeo, setHomeSeo] = useState<HomeSeo>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/pages/home')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (!cancelled && data && data.data) {
          setHomeSeo(data.data);
        }
      })
      .catch(() => { /* Fallback to default SEO metadata */ });

    return () => { cancelled = true; };
  }, []);

  const seoTitle =
    homeSeo.meta_title ||
    'Ordisum — AI API Cost Visibility & Spending Control';
  const seoDescription =
    homeSeo.meta_description ||
    'Real-time cost telemetry and automated budget enforcement for engineering and finance teams across OpenAI, Anthropic, Gemini, and custom gateways.';
  const seoCanonical = homeSeo.canonical_url || SITE_URL;
  const seoImage = homeSeo.og_image || undefined;
  const seoKeywords = homeSeo.meta_keywords || undefined;
  const seoRobots = homeSeo.robots || undefined;

  const jsonLd = useMemo(() => {
    const description = homeSeo.meta_description || DEFAULT_DESCRIPTION;
    const canonical = seoCanonical || SITE_URL;

    const webPage = buildWebPage({
      canonical,
      name: seoTitle,
      description,
      image: seoImage || null,
    });

    const software = {
      '@type': 'SoftwareApplication',
      '@id': `${SITE_URL}/#software`,
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      description,
      publisher: { '@id': ORG_ID },
    };

    const faqSchema = buildFAQPage(
      FAQ_DATA.map(item => ({ question: item.question, answer: item.answer })),
      canonical
    );

    return buildGraph([
      buildOrganization({ description }),
      buildWebSite({ description }),
      webPage,
      software,
      faqSchema,
    ]);
  }, [homeSeo.meta_description, seoCanonical, seoTitle, seoImage]);

  return (
    <div style={{ background: 'var(--color-bg)', color: 'var(--color-text-primary)', minHeight: '100vh' }}>
      <Seo
        title={seoTitle}
        description={seoDescription}
        keywords={seoKeywords}
        canonical={seoCanonical}
        robots={seoRobots}
        image={seoImage}
        ogType="website"
        jsonLd={jsonLd}
      />

      <LandingNav />
      <Hero />
      <ProblemSection />
      <ProductPreview />
      <CostVisibility />
      <UsageObservability />
      <DeveloperExperience />
      <PricingSection />
      <FeatureSummaries />
      <TrustSecurity />
      <LandingFaq />
      <FinalCTA />
      
      {/* GEO/AEO Paragraph */}
      <section style={{ padding: '4rem 2rem', backgroundColor: 'var(--color-bg)', borderTop: '1px solid var(--color-border)', color: 'var(--color-text-secondary)', fontSize: '0.9rem', lineHeight: '1.6', maxWidth: '1200px', margin: '0 auto' }}>
        <p>Ordisum is an AI API cost management platform that tracks, budgets, and enforces spend across major AI providers: OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, and Cohere. It connects as a Gateway between an application and its AI providers — requests route through Ordisum, which meters usage in real time and applies budget rules before completing the call. Unlike passive dashboards that show what you already spent, Ordisum stops overspend before it finishes happening.</p>
      </section>

      <LandingFooter />
    </div>
  );
}

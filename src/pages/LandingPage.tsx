import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
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
import styles from './LandingPage.module.css';

// ─── CMS SEO shape (homepage metadata is CMS-controlled with safe fallbacks) ──
interface HomeSeo {
  meta_title?: string | null;
  meta_description?: string | null;
  meta_keywords?: string | null;
  canonical_url?: string | null;
  og_image?: string | null;
  robots?: string | null;
}

// ─── SVG ICONS ───────────────────────────────────────────────────────────────
// Consistent 24px line-icon set, 1.5px stroke, no fill

const IconCost = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    <circle cx="12" cy="12" r="4" />
  </svg>
);

const IconShield = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const IconKey = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="7.5" cy="15.5" r="5.5" />
    <path d="M21 2l-9.6 9.6M15.5 7.5L19 11l3-3" />
  </svg>
);

const IconChart = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
  </svg>
);

const IconAlert = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconGlobe = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
);

// Social icons
const IconGithub = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22" />
  </svg>
);

const IconTwitter = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z" />
  </svg>
);

const IconLinkedIn = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
    <rect x="2" y="9" width="4" height="12" />
    <circle cx="4" cy="4" r="2" />
  </svg>
);

// ─── MINI CHART DATA ──────────────────────────────────────────────────────────
const chartData = [28, 45, 32, 58, 41, 67, 52, 74, 61, 83, 70, 92, 78, 100];

// ─── HELPER ──────────────────────────────────────────────────────────────────
const formatUrl = (url: string) => {
  if (!url) return '#';
  if (url.startsWith('/') || url.startsWith('#') || url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:')) {
    return url;
  }
  return `https://${url}`;
};

// ─── COMPONENT ───────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [pricingPlans, setPricingPlans] = useState<any[]>([]);
  const [siteLinks, setSiteLinks] = useState<any>({ product: [], company: [], legal: [], social: [] });
  const [homeSeo, setHomeSeo] = useState<HomeSeo>({});

  useEffect(() => {
    fetch('/api/public/pricing-plans')
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.length > 0) {
          setPricingPlans(data.data);
        }
      })
      .catch(err => console.error('Failed to load pricing:', err));

    fetch('/api/public/site-links')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setSiteLinks(data.data);
        }
      })
      .catch(err => console.error('Failed to load site links:', err));

    // Homepage SEO metadata is CMS-controlled (static_pages slug "home").
    // Fetch is best-effort: if the record is absent the page falls back to
    // the hardcoded defaults below, so the homepage never regresses.
    fetch('/api/public/pages/home')
      .then(res => (res.ok ? res.json() : null))
      .then(data => {
        if (data && data.data) {
          setHomeSeo(data.data);
        }
      })
      .catch(() => { /* no CMS record — fall back to defaults */ });
  }, []);

  // ─── Resolved SEO values (CMS → fallback default) ──────────────────────────
  const seoTitle =
    homeSeo.meta_title ||
    'Ordisum — AI API Cost Management & Observability';
  const seoDescription =
    homeSeo.meta_description ||
    'Real-time observability for your AI API spend — track costs across every provider, model, and team with Ordisum.';
  const seoCanonical = homeSeo.canonical_url || SITE_URL;
  const seoImage = homeSeo.og_image || undefined;
  const seoKeywords = homeSeo.meta_keywords || undefined;
  const seoRobots = homeSeo.robots || undefined;

  // ─── Structured data: shared @graph (SEO-20) ───────────────────────────────
  // Organization + WebSite + WebPage from the shared schema core, PLUS a
  // truthful SoftwareApplication for the product itself. No invented ratings,
  // customer counts, offers, or pricing — only fields we can stand behind.
  const jsonLd = useMemo(() => {
    const description = homeSeo.meta_description || DEFAULT_DESCRIPTION;
    const canonical = seoCanonical || SITE_URL;

    const webPage = buildWebPage({
      canonical,
      name: seoTitle,
      description,
      image: seoImage || null,
    });

    // SoftwareApplication — the product entity, published by the Organization.
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

    const faq = buildFAQPage([
      { question: 'Do I need to install an SDK?', answer: 'No — change your base URL to the Ordisum Gateway and use an Ordisum API key.' },
      { question: 'What happens when I hit my budget?', answer: 'Requests are automatically throttled/blocked before exceeding the limit you set.' },
      { question: 'Which providers do you support?', answer: 'OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere.' },
      { question: 'Do you store my prompts?', answer: 'No — only cost and usage metadata.' }
    ], canonical);

    return buildGraph([
      buildOrganization({ description }),
      buildWebSite({ description }),
      webPage,
      software,
      faq,
    ]);
  }, [homeSeo.meta_description, seoCanonical, seoTitle, seoImage]);

  return (
    <div className={styles.page}>
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

      {/* ── NAVBAR ─────────────────────────────────────────────────── */}
      <nav className={styles.nav}>
        <Link to="/" className={styles.navLogo}>
          <div className={styles.navLogoMark}>II</div>
          <span className={styles.navLogoText}>Ordisum</span>
        </Link>

        <ul className={styles.navLinks}>
          <li><a href="#features">Product</a></li>
          <li><a href="#pricing">Pricing</a></li>
          <li><a href="/docs">Docs</a></li>
          <li><a href="#api">API</a></li>
        </ul>

        <div className={styles.navActions}>
          <Link to="/auth/signin" className={styles.btnGhost}>Sign In</Link>
          <Link to="/auth/signup" className={styles.btnPrimary}>Get Started</Link>
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <p className={styles.heroEyebrow}>AI Cost Intelligence Platform</p>
          <h1 className={styles.heroHeadline}>
            Track every token.<br />
            <em>Control every cost.</em>
          </h1>
          <p className={styles.heroSub}>
            Real-time observability for your AI API spend — across every provider, every model, every team. Set budgets that actually enforce.
          </p>
          <div className={styles.heroCtas}>
            <Link to="/auth/signup" className={styles.btnHeroPrimary}>
              Start Free Trial
            </Link>
            <a href="#features" className={styles.btnHeroSecondary}>
              See how it works
            </a>
          </div>
        </div>

        {/* Dashboard Widget / Image Placeholder */}
        <div className={styles.heroWidget} style={{ position: 'relative' }}>
          {/* PLACEHOLDER: Replace this div/img with the actual product screenshot provided later */}
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: '12px' }}>
             <img src="/images/placeholder-hero.svg" alt="Ordisum Dashboard Placeholder" style={{ maxWidth: '100%', height: 'auto', opacity: 0.5 }} />
             <p style={{ position: 'absolute', color: 'white', fontWeight: 'bold' }}>Dashboard Image Placeholder</p>
          </div>
          
          <div className={styles.widgetTopBar}>
            <div className={styles.widgetDots}>
              <div className={styles.widgetDot} />
              <div className={styles.widgetDot} />
              <div className={styles.widgetDot} />
            </div>
            <span className={styles.widgetTitle}>COST ANALYTICS</span>
            <span style={{ width: 48 }} />
          </div>

          <div className={styles.widgetBody}>
            <div className={styles.widgetKpiRow}>
              <div className={styles.widgetKpi}>
                <div className={styles.widgetKpiLabel}>Total Spend</div>
                <div className={styles.widgetKpiValue}>$2,847</div>
                <div className={styles.widgetKpiSub}>this month</div>
              </div>
              <div className={styles.widgetKpi}>
                <div className={styles.widgetKpiLabel}>Requests</div>
                <div className={styles.widgetKpiValue}>48.3K</div>
                <div className={styles.widgetKpiSub}>last 30 days</div>
              </div>
              <div className={styles.widgetKpi}>
                <div className={styles.widgetKpiLabel}>Avg Cost/1K</div>
                <div className={styles.widgetKpiValue}>$0.058</div>
                <div className={styles.widgetKpiSub}>tokens</div>
              </div>
              <div className={styles.widgetKpi}>
                <div className={styles.widgetKpiLabel}>Budget Used</div>
                <div className={styles.widgetKpiValue}>71%</div>
                <div className={styles.widgetKpiSub}>$4,000 limit</div>
              </div>
            </div>

            <div className={styles.widgetChartLabel}>Daily Spend — 14 days</div>
            <div className={styles.miniChart}>
              {chartData.map((h, i) => (
                <div
                  key={i}
                  className={`${styles.miniBar} ${i === chartData.length - 1 ? styles.miniBarActive : ''}`}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>

            <hr className={styles.widgetDivider} />

            <div className={styles.widgetLogList}>
              {[
                { provider: 'groq / llama-3.3-70b', tokens: '12,480 tok', cost: '$0.0062' },
                { provider: 'openai / gpt-4o-mini', tokens: '8,240 tok', cost: '$0.0041' },
                { provider: 'anthropic / claude-3-haiku', tokens: '6,100 tok', cost: '$0.0037' },
              ].map((row, i) => (
                <div key={i} className={styles.widgetLogRow}>
                  <span className={styles.widgetLogProvider}>{row.provider}</span>
                  <span className={styles.widgetLogTokens}>{row.tokens}</span>
                  <span className={styles.widgetLogCost}>{row.cost}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST BAR ──────────────────────────────────────────────── */}
      <div className={styles.trustBar}>
        <div className={styles.trustBarInner}>
          <span className={styles.trustBarLabel}>Works with</span>
          <div className={styles.trustBarDivider} />
          <div className={styles.trustProviders}>
            {['OpenAI', 'Anthropic', 'Groq', 'Google AI', 'Mistral', 'Cohere', 'Azure'].map(p => (
              <span key={p} className={styles.trustProvider}>{p}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── PROBLEM ────────────────────────────────────────────────── */}
      <section className={styles.problem}>
        <p className={styles.problemEyebrow}>The Problem</p>
        <div className={styles.problemGrid}>
          <div className={styles.problemLeft}>
            <h2 className={styles.problemHeadline}>
              AI spend is growing faster than<br />
              <em>your ability to understand it.</em>
            </h2>
          </div>
          <div className={styles.problemRight}>
            {[
              {
                title: 'No model-level visibility',
                body: 'You see a monthly bill — not which model, team, or workflow is driving it.',
              },
              {
                title: 'Spend surprises at month end',
                body: 'By the time you notice the bill, the damage is done. You need enforcement, not alerts.',
              },
              {
                title: 'API usage is a black box',
                body: 'Every external app or script using your keys is invisible — no tracking, no control.',
              },
            ].map(p => (
              <div key={p.title} className={styles.problemPoint}>
                <p className={styles.problemPointTitle}>{p.title}</p>
                <p className={styles.problemPointBody}>{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FEATURES ───────────────────────────────────────────────── */}
      <section className={styles.features} id="features">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Platform</p>
          <h2 className={styles.sectionTitle}>
            Everything you need to own<br />your AI cost stack
          </h2>
        </div>

        <div className={styles.featuresGrid}>
          {[
            {
              icon: <IconChart />,
              title: 'Cost Analytics',
              body: 'Per-model, per-provider daily breakdown. See exactly where your spend is going — not just the total.',
            },
            {
              icon: <IconShield />,
              title: 'Budget Enforcement',
              body: 'Set monthly or quarterly hard limits. Requests are blocked before they exceed your budget — not after.',
            },
            {
              icon: <IconKey />,
              title: 'External API Gateway',
              body: 'Issue platform keys (ii_sk_...) for external apps. Every call tracked, every token counted, revocable instantly.',
            },
            {
              icon: <IconAlert />,
              title: 'Smart Alerts',
              body: 'Configure rules for spend spikes, error rates, token thresholds. Alerts fire on real data, not estimates.',
            },
            {
              icon: <IconCost />,
              title: 'ROI Calculator',
              body: 'Quantify the value your AI usage delivers. Export reports for finance or stakeholders.',
            },
            {
              icon: <IconGlobe />,
              title: 'Multi-Provider',
              body: 'One dashboard for OpenAI, Anthropic, Groq, Google, Mistral, Cohere and Azure — switch without changing your analytics.',
            },
          ].map(f => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.icon}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureBody}>{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ───────────────────────────────────────────── */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>How it works</p>
          <h2 className={styles.sectionTitle}>Up in minutes, not days</h2>
        </div>

        <div className={styles.stepsRow}>
          {[
            {
              n: '01',
              title: 'Connect your providers',
              body: 'Add your existing API keys from OpenAI, Groq, Anthropic or any supported provider. Keys are encrypted at rest.',
            },
            {
              n: '02',
              title: 'Route through the gateway',
              body: 'Replace your API base URL with ours, or use the Playground directly. No code changes required.',
            },
            {
              n: '03',
              title: 'Every request logged',
              body: 'Tokens, cost, latency and provider — captured automatically for every call, including failures.',
            },
            {
              n: '04',
              title: 'Set limits and alerts',
              body: 'Define budgets with hard enforcement. Configure alert rules. Your spend is now under your control.',
            },
          ].map(s => (
            <div key={s.n} className={styles.step}>
              <div className={styles.stepNumber}>
                <div className={styles.stepNumberDot}>{s.n}</div>
              </div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepBody}>{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── API GATEWAY HIGHLIGHT ───────────────────────────────────── */}
      <div className={styles.apiSection} id="api">
        <div className={styles.apiSectionLeft}>
          <p className={styles.sectionEyebrow}>External API Gateway</p>
          <h2 className={styles.sectionTitle} style={{ fontSize: 'clamp(24px, 3vw, 34px)', marginTop: 12 }}>
            Track usage from<br /><em>any external app</em>
          </h2>
          <p style={{ fontSize: 13, fontWeight: 300, color: 'var(--muted2)', lineHeight: 1.7, marginTop: 16, marginBottom: 0 }}>
            Issue platform keys for your scripts, automations and third-party tools. Every request is logged against your dashboard — with full token counts, costs and error tracking. Revoke instantly. No code changes needed on the caller's side.
          </p>
        </div>

        <div className={styles.apiSectionRight}>
          <div className={styles.codeBlock}>
            <span className={styles.codeComment}># Drop-in replacement for any OpenAI SDK</span>
            {'\n\n'}
            <span className={styles.codeKeyword}>from</span>
            {' openai '}
            <span className={styles.codeKeyword}>import</span>
            {' OpenAI\n\n'}
            {'client = OpenAI(\n'}
            {'  api_key='}
            <span className={styles.codeString}>"ii_sk_live_••••a1b2"</span>
            {',\n'}
            {'  base_url='}
            <span className={styles.codeString}>"https://api.yourdomain.com/v1"</span>
            {'\n)\n\n'}
            {'response = client.chat.completions.create(\n'}
            {'  model='}
            <span className={styles.codeString}>"llama-3.3-70b-versatile"</span>
            {',\n'}
            {'  messages=[{'}
            <span className={styles.codeString}>"role"</span>
            {': '}
            <span className={styles.codeString}>"user"</span>
            {', '}
            <span className={styles.codeString}>"content"</span>
            {': '}
            <span className={styles.codeString}>"Hello"</span>
            {'}]\n)'}
            {'\n\n'}
            <span className={styles.codeComment}># → logged to your dashboard automatically</span>
          </div>
        </div>
      </div>

      {/* ── PRICING ────────────────────────────────────────────────── */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>Pricing</p>
          <h2 className={styles.sectionTitle}>Simple pricing, no surprises</h2>
        </div>

        <div className={styles.pricingGrid}>
          {pricingPlans.length > 0 ? (
            pricingPlans.map((plan: any) => (
              <div key={plan.id} className={`${styles.pricingCard} ${plan.is_popular ? styles.pricingCardFeatured : ''}`}>
                <p className={styles.pricingPlan}>{plan.name}</p>
                <div className={styles.pricingPrice}>
                  {plan.price_monthly === 0 ? (
                    <><sup>$</sup>0</>
                  ) : plan.price_monthly ? (
                    <><sup>$</sup>{plan.price_monthly}</>
                  ) : (
                    <span style={{ fontSize: 32 }}>Custom</span>
                  )}
                </div>
                <p className={styles.pricingPeriod}>{plan.tagline || 'Contact us for details'}</p>
                <hr className={styles.pricingDivider} />
                <ul className={styles.pricingFeatures}>
                  {plan.display_features?.map((feature: any, idx: number) => (
                    <li
                      key={idx}
                      style={{
                        opacity: typeof feature === 'object' && feature.included === false ? 0.4 : 1,
                        textDecoration: typeof feature === 'object' && feature.included === false ? 'line-through' : 'none'
                      }}
                    >
                      {typeof feature === 'string' ? feature : feature.text}
                    </li>
                  ))}
                </ul>
                <Link to={`/auth/signup?plan=${plan.slug}`} className={`${styles.pricingCta} ${plan.is_popular ? styles.pricingCtaFeatured : ''}`}>
                  {plan.cta_text || 'Start free trial'}
                </Link>
              </div>
            ))
          ) : (
            <>
              {/* Starter */}
              <div className={styles.pricingCard}>
                <p className={styles.pricingPlan}>Starter</p>
                <div className={styles.pricingPrice}><sup>$</sup>0</div>
                <p className={styles.pricingPeriod}>14-day free trial, then free tier</p>
                <hr className={styles.pricingDivider} />
                <ul className={styles.pricingFeatures}>
                  <li>Up to 10,000 logged requests/mo</li>
                  <li>1 connected provider</li>
                  <li>Cost Analytics dashboard</li>
                  <li>Basic budget alerts</li>
                  <li>7-day data retention</li>
                </ul>
                <Link to="/auth/signup" className={styles.pricingCta}>Get started free</Link>
              </div>

              {/* Professional */}
              <div className={`${styles.pricingCard} ${styles.pricingCardFeatured}`}>
                <p className={styles.pricingPlan}>Professional</p>
                <div className={styles.pricingPrice}><sup>$</sup>49</div>
                <p className={styles.pricingPeriod}>per month, billed monthly</p>
                <hr className={styles.pricingDivider} />
                <ul className={styles.pricingFeatures}>
                  <li>Unlimited logged requests</li>
                  <li>All supported providers</li>
                  <li>Hard budget enforcement</li>
                  <li>Platform API Keys (external gateway)</li>
                  <li>Alert rules (cost, tokens, errors, spikes)</li>
                  <li>Reports + CSV/PDF export</li>
                  <li>90-day data retention</li>
                </ul>
                <Link to="/auth/signup?plan=professional" className={`${styles.pricingCta} ${styles.pricingCtaFeatured}`}>
                  Start free trial
                </Link>
              </div>

              {/* Enterprise */}
              <div className={styles.pricingCard}>
                <p className={styles.pricingPlan}>Enterprise</p>
                <div className={styles.pricingPrice} style={{ fontSize: 32 }}>Custom</div>
                <p className={styles.pricingPeriod}>volume pricing, SLA available</p>
                <hr className={styles.pricingDivider} />
                <ul className={styles.pricingFeatures}>
                  <li>Everything in Professional</li>
                  <li>Dedicated support</li>
                  <li>Custom data retention</li>
                  <li>SSO / SAML</li>
                  <li>Team roles and permissions</li>
                  <li>Priority onboarding</li>
                </ul>
                <Link to="/contact-sales" className={styles.pricingCta}>Contact sales</Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────────────────────────── */}
      <section className={styles.pricing} id="faq" style={{ paddingBottom: 0 }}>
        <div className={styles.sectionHeader}>
          <p className={styles.sectionEyebrow}>FAQ</p>
          <h2 className={styles.sectionTitle}>Frequently asked questions</h2>
        </div>
        <div className={styles.problemGrid} style={{ marginTop: '3rem' }}>
          <div className={styles.problemRight} style={{ margin: '0 auto', maxWidth: '800px', gridColumn: '1 / -1' }}>
            {[
              {
                q: 'Do I need to install an SDK?',
                a: 'No — change your base URL to the Ordisum Gateway and use an Ordisum API key.',
              },
              {
                q: 'What happens when I hit my budget?',
                a: 'Requests are automatically throttled/blocked before exceeding the limit you set.',
              },
              {
                q: 'Which providers do you support?',
                a: 'OpenAI, Anthropic, Google Gemini, Azure OpenAI, AWS Bedrock, Mistral, Groq, Cohere.',
              },
              {
                q: 'Do you store my prompts?',
                a: 'No — only cost and usage metadata.',
              },
            ].map(f => (
              <div key={f.q} className={styles.problemPoint} style={{ marginBottom: '2rem' }}>
                <p className={styles.problemPointTitle} style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>{f.q}</p>
                <p className={styles.problemPointBody}>{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── RELATED LINKS ──────────────────────────────────────────── */}
      <section className={styles.pricing} style={{ paddingTop: '2rem', paddingBottom: '4rem', background: 'transparent' }}>
        <div className={styles.sectionHeader} style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', color: 'var(--muted2)' }}>Explore more</h3>
        </div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', justifyContent: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <Link to="/features" className={styles.btnGhost} style={{ fontSize: '0.9rem' }}>see the full feature set</Link>
          <Link to="/pricing" className={styles.btnGhost} style={{ fontSize: '0.9rem' }}>view pricing</Link>
          <Link to="/security" className={styles.btnGhost} style={{ fontSize: '0.9rem' }}>read our security model</Link>
          <Link to="/use-cases/ai-cost-monitoring" className={styles.btnGhost} style={{ fontSize: '0.9rem' }}>see how teams monitor AI costs</Link>
          <Link to="/use-cases/ai-budget-management" className={styles.btnGhost} style={{ fontSize: '0.9rem' }}>see how budget enforcement works</Link>
        </div>
      </section>

      {/* ── FINAL CTA ──────────────────────────────────────────────── */}
      <section className={styles.finalCta}>
        <div className={styles.finalCtaInner}>
          <h2 className={styles.finalCtaHeadline}>
            Your AI spend deserves<br />
            <em>more than a line item.</em>
          </h2>
          <p className={styles.finalCtaSub}>
            Start your 14-day free trial. No credit card required.
          </p>
          <div className={styles.finalCtaActions}>
            <Link to="/auth/signup" className={styles.btnHeroPrimary}>
              Start Free Trial
            </Link>
            <Link to="/docs" className={styles.btnHeroSecondary}>
              Read the docs
            </Link>
          </div>
          <p className={styles.finalNote}>14-day trial · No credit card · Cancel anytime</p>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div className={styles.footerBrand}>
              <Link to="/" className={styles.navLogo} style={{ display: 'inline-flex' }}>
                <div className={styles.navLogoMark}>II</div>
                <span className={styles.navLogoText}>Ordisum</span>
              </Link>
              <p>AI API cost management, observability and ROI tracking — for teams that take their spend seriously.</p>
            </div>

            <div>
              <p className={styles.footerColTitle}>Product</p>
              <ul className={styles.footerLinks}>
                {siteLinks.product?.length > 0 ? (
                  siteLinks.product.map((link: any) => (
                    <li key={link.id}>
                      {link.url.startsWith('/') || link.url.startsWith('#') ? (
                        <a href={link.url}>{link.label}</a>
                      ) : (
                        <a href={formatUrl(link.url)} target="_blank" rel="noopener noreferrer">{link.label}</a>
                      )}
                    </li>
                  ))
                ) : (
                  <>
                    <li><a href="#features">Features</a></li>
                    <li><a href="#pricing">Pricing</a></li>
                    <li><Link to="/docs">Documentation</Link></li>
                    <li><a href="#api">API Reference</a></li>
                    <li><Link to="/dashboard/playground">Playground</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <p className={styles.footerColTitle}>Company</p>
              <ul className={styles.footerLinks}>
                {siteLinks.company?.length > 0 ? (
                  siteLinks.company.map((link: any) => (
                    <li key={link.id}>
                      {link.url.startsWith('/') || link.url.startsWith('#') ? (
                        <a href={link.url}>{link.label}</a>
                      ) : (
                        <a href={formatUrl(link.url)} target="_blank" rel="noopener noreferrer">{link.label}</a>
                      )}
                    </li>
                  ))
                ) : (
                  <>
                    <li><a href="/about">About</a></li>
                    <li><a href="/blog">Blog</a></li>
                    <li><Link to="/contact-sales">Contact</Link></li>
                  </>
                )}
              </ul>
            </div>

            <div>
              <p className={styles.footerColTitle}>Legal</p>
              <ul className={styles.footerLinks}>
                {siteLinks.legal?.length > 0 ? (
                  siteLinks.legal.map((link: any) => (
                    <li key={link.id}>
                      {link.url.startsWith('/') || link.url.startsWith('#') ? (
                        <a href={link.url}>{link.label}</a>
                      ) : (
                        <a href={formatUrl(link.url)} target="_blank" rel="noopener noreferrer">{link.label}</a>
                      )}
                    </li>
                  ))
                ) : (
                  <>
                    <li><a href="/privacy">Privacy Policy</a></li>
                    <li><a href="/terms">Terms of Service</a></li>
                    <li><a href="/security">Security</a></li>
                  </>
                )}
              </ul>
            </div>
          </div>

          <div className={styles.footerBottom}>
            <span className={styles.footerCopy}>
              © {new Date().getFullYear()} Ordisum. All rights reserved.
            </span>
            <div className={styles.footerSocials}>
              {siteLinks.social?.length > 0 ? (
                siteLinks.social.map((link: any) => {
                  const name = link.label.toLowerCase();
                  let Icon = null;
                  if (name.includes('github')) Icon = IconGithub;
                  else if (name.includes('twitter') || name.includes('x')) Icon = IconTwitter;
                  else if (name.includes('linkedin')) Icon = IconLinkedIn;

                  return (
                    <a key={link.id} href={formatUrl(link.url)} aria-label={link.label} target="_blank" rel="noopener noreferrer">
                      {Icon ? <Icon /> : link.label}
                    </a>
                  );
                })
              ) : (
                <>
                  <a href="https://github.com" aria-label="GitHub" target="_blank" rel="noopener noreferrer">
                    <IconGithub />
                  </a>
                  <a href="https://twitter.com" aria-label="Twitter" target="_blank" rel="noopener noreferrer">
                    <IconTwitter />
                  </a>
                  <a href="https://linkedin.com" aria-label="LinkedIn" target="_blank" rel="noopener noreferrer">
                    <IconLinkedIn />
                  </a>
                </>
              )}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}

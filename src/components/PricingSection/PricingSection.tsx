import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './PricingSection.module.css';

const CheckIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MinusIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14" strokeLinecap="round" />
  </svg>
);

interface PricingFeature {
  text: string;
  included: boolean;
}

interface Plan {
  name: string;
  slug: string;
  monthlyPrice: string;
  annualPrice: string;
  tagline: string;
  features: PricingFeature[];
  ctaText: string;
  ctaVariant: 'primary' | 'ghost' | 'enterprise';
  isPopular: boolean;
}

// Shape returned by GET /api/admin/plans's EDITABLE columns, as served by
// GET /api/public/pricing-plans (see backend/src/routes/public.js).
interface ApiPlan {
  id: string;
  name: string;
  slug: string;
  price_monthly: number;
  price_annual: number;
  tagline: string;
  is_popular: boolean;
  cta_text: string;
  cta_variant: 'primary' | 'ghost' | 'enterprise';
  sort_order: number;
  display_features: PricingFeature[] | null;
}

function apiPlanToPlan(p: ApiPlan): Plan {
  const isCustom = Number(p.price_monthly) === 0 && Number(p.price_annual) === 0;
  return {
    name: p.name,
    slug: p.slug,
    monthlyPrice: isCustom ? 'Custom' : `$${p.price_monthly}`,
    annualPrice: isCustom ? 'Custom' : `$${p.price_annual}`,
    tagline: p.tagline,
    features: p.display_features ?? [],
    ctaText: p.cta_text,
    ctaVariant: p.cta_variant,
    isPopular: p.is_popular,
  };
}

// Fallback — renders immediately on first paint (no loading flicker, good
// for SEO/LCP on the landing page) and stays as a safety net if the fetch
// below fails or the plans table is temporarily empty. Live data from
// /api/public/pricing-plans replaces this once it arrives.
//
// WARNING: FALLBACK_PLANS must NEVER become an independent pricing authority.
// It is strictly a UI rendering fallback and must exactly mirror the canonical
// plan configuration in the database. Any database/schema change to plans must
// be manually synced here. Fallback data must NEVER be used for billing,
// checkout, authorization, or backend system limits.
const FALLBACK_PLANS: Plan[] = [
  {
    name: 'Solo',
    slug: 'entry',
    monthlyPrice: '$19',
    annualPrice: '$15',
    tagline: 'For individuals getting started',
    isPopular: false,
    ctaText: 'Start Free Trial',
    ctaVariant: 'ghost',
    features: [
      { text: '1 Team Member', included: true },
      { text: '2 Platform Keys', included: true },
      { text: '1 Budget Rule', included: true },
      { text: 'Basic Analytics', included: true },
      { text: 'AI Playground Access', included: true },
      { text: 'Premium Models', included: false },
    ],
  },
  {
    name: 'Starter',
    slug: 'starter',
    monthlyPrice: '$49',
    annualPrice: '$39',
    tagline: 'For small teams',
    isPopular: false,
    ctaText: 'Start Free Trial',
    ctaVariant: 'ghost',
    features: [
      { text: '5 Team Members', included: true },
      { text: '5 Platform Keys', included: true },
      { text: '3 Budget Rules & 5 Alerts', included: true },
      { text: 'Basic Analytics & Reports', included: true },
      { text: 'API Gateway', included: true },
      { text: 'Premium Models', included: false },
    ],
  },
  {
    name: 'Professional',
    slug: 'pro',
    monthlyPrice: '$89',
    annualPrice: '$79',
    tagline: 'For growing AI teams',
    isPopular: true,
    ctaText: 'Start Free Trial',
    ctaVariant: 'primary',
    features: [
      { text: '15 Team Members', included: true },
      { text: 'Unlimited Platform Keys', included: true },
      { text: '10 Budget Rules & 20 Alerts', included: true },
      { text: 'Advanced Analytics & ROI', included: true },
      { text: 'Premium Model Access', included: true },
      { text: 'CSV Exports', included: true },
    ],
  },
  {
    name: 'Business',
    slug: 'business',
    monthlyPrice: '$199',
    annualPrice: '$159',
    tagline: 'For organizations scaling AI',
    isPopular: false,
    ctaText: 'Start Free Trial',
    ctaVariant: 'ghost',
    features: [
      { text: '50 Team Members', included: true },
      { text: '50 Platform Keys', included: true },
      { text: '100 Alerts & 50 Budgets', included: true },
      { text: 'PDF Exports & Webhooks', included: true },
      { text: 'Slack Alerts Integration', included: true },
      { text: 'Cost Spike Detection', included: true },
    ],
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    tagline: 'For large organizations',
    isPopular: false,
    ctaText: 'Contact Sales',
    ctaVariant: 'enterprise',
    features: [
      { text: 'Unlimited Team Members', included: true },
      { text: 'Unlimited Platform Keys', included: true },
      { text: 'Unlimited Rules & Budgets', included: true },
      { text: 'Anomaly Detection', included: true },
      { text: 'Dedicated Support Account', included: true },
      { text: 'Custom MSA & Invoicing', included: true },
    ],
  },
];

const faqs = [
  { q: 'How does billing work?', a: 'We bill monthly or annually. Annual plans get 20% off. No hidden fees.' },
  { q: 'Can I change plans later?', a: 'Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle.' },
  { q: 'What integrations do you support?', a: 'We support 50+ AI providers including OpenAI, Anthropic, Google, Azure, and more.' },
  { q: 'Is my data secure?', a: 'Yes. We use industry-standard encryption in transit (TLS) and at rest, with strict access controls and row-level security.' },
  { q: 'Do you offer a free trial?', a: 'All plans come with a 14-day free trial. No credit card required to start.' },
  { q: 'What happens if I exceed my limits?', a: 'We\u2019ll notify you before you hit a limit. You can upgrade or pay for overages.' },
];

const PricingSection: React.FC = () => {
  const sectionRef = useScrollReveal();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [plans, setPlans] = useState<Plan[]>(FALLBACK_PLANS);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/pricing-plans')
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled && Array.isArray(body?.data) && body.data.length > 0) {
          setPlans((body.data as ApiPlan[]).map(apiPlanToPlan));
        }
      })
      .catch((err) => console.error('[PricingSection] Failed to load plans:', err));
    return () => { cancelled = true; };
  }, []);

  function handlePlanCta(plan: Plan) {
    if (plan.slug === 'enterprise') {
      navigate('/contact-sales');
    } else {
      // Plan choice is carried through signup via SignUp.tsx (localStorage,
      // since it needs to survive the Google OAuth redirect round-trip) —
      // see SignUp.tsx / Callback.tsx / Onboarding.tsx / Billing.tsx for
      // the rest of the chain that turns this into an actual checkout
      // right after the user finishes signing up.
      navigate(`/auth/signup?plan=${plan.slug}`);
    }
  }

  return (
    <section id="pricing" ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <span className={styles.label}>Pricing</span>
        <h2 className={styles.headline}>Simple, transparent pricing</h2>
        <p className={styles.subhead}>Every plan includes unlimited usage tracking. Pay for the seats and controls you need.</p>

        <div className={styles.toggleWrap}>
          <button
            className={`${styles.toggle} ${!isAnnual ? styles.active : ''}`}
            onClick={() => setIsAnnual(false)}
          >
            Monthly
          </button>
          <button
            className={`${styles.toggle} ${isAnnual ? styles.active : ''}`}
            onClick={() => setIsAnnual(true)}
          >
            Annual
            <span className={styles.saveBadge}>Save 20%</span>
          </button>
        </div>

        <div className={styles.plans}>
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`${styles.planCard} ${plan.isPopular ? styles.popular : ''}`}
            >
              {plan.isPopular && <div className={styles.popularBadge}>Most Popular</div>}

              <h3 className={styles.planName}>{plan.name}</h3>
              <p className={styles.planTagline}>{plan.tagline}</p>

              <div className={styles.price}>
                <span className={styles.priceAmount}>
                  {isAnnual ? plan.annualPrice : plan.monthlyPrice}
                </span>
                {plan.monthlyPrice !== 'Custom' && <span className={styles.pricePeriod}>/mo</span>}
              </div>

              <button
                className={`${styles.planCta} ${styles[plan.ctaVariant]}`}
                onClick={() => handlePlanCta(plan)}
              >
                {plan.ctaText}
              </button>

              <ul className={styles.features}>
                {plan.features.map((f, i) => (
                  <li key={i} className={f.included ? styles.featureIncluded : styles.featureExcluded}>
                    <span className={styles.checkIcon}>{f.included ? <CheckIcon /> : <MinusIcon />}</span>
                    {f.text}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className={styles.faq}>
          <h3 className={styles.faqTitle}>Frequently Asked Questions</h3>
          <div className={styles.faqList}>
            {faqs.map((faq, i) => (
              <div key={i} className={`${styles.faqItem} ${openIndex === i ? styles.open : ''}`}>
                <button className={styles.faqQuestion} onClick={() => setOpenIndex(openIndex === i ? null : i)}>
                  {faq.q}
                  <span className={styles.faqIcon}>{openIndex === i ? '\u2212' : '+'}</span>
                </button>
                <div className={styles.faqAnswer}>
                  <p>{faq.a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default PricingSection;
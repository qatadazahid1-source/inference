import { useState } from 'react';
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
  monthlyPrice: string;
  annualPrice: string;
  tagline: string;
  features: PricingFeature[];
  ctaText: string;
  ctaVariant: 'primary' | 'ghost' | 'enterprise';
  isPopular: boolean;
}

const plans: Plan[] = [
  {
    name: 'Starter',
    monthlyPrice: '$49',
    annualPrice: '$39',
    tagline: 'Perfect for small teams',
    isPopular: false,
    ctaText: 'Start Free Trial',
    ctaVariant: 'ghost',
    features: [
      { text: '1 organization', included: true },
      { text: '3 team members', included: true },
      { text: '5 AI integrations', included: true },
      { text: 'Basic analytics', included: true },
      { text: 'Email reports', included: true },
      { text: 'Custom reports', included: false },
      { text: 'API access', included: false },
    ],
  },
  {
    name: 'Professional',
    monthlyPrice: '$149',
    annualPrice: '$119',
    tagline: 'For growing teams',
    isPopular: true,
    ctaText: 'Start Free Trial',
    ctaVariant: 'primary',
    features: [
      { text: '1 organization', included: true },
      { text: '15 team members', included: true },
      { text: 'Unlimited integrations', included: true },
      { text: 'Custom reports', included: true },
      { text: 'API access', included: true },
      { text: 'Slack & Teams alerts', included: true },
      { text: 'ROI calculator', included: true },
    ],
  },
  {
    name: 'Business',
    monthlyPrice: '$399',
    annualPrice: '$319',
    tagline: 'Scale with confidence',
    isPopular: false,
    ctaText: 'Start Free Trial',
    ctaVariant: 'ghost',
    features: [
      { text: '3 organizations', included: true },
      { text: '50 team members', included: true },
      { text: 'Everything in Pro', included: true },
      { text: 'White-label reports', included: true },
      { text: 'SSO / SAML', included: true },
      { text: 'Priority support', included: true },
    ],
  },
  {
    name: 'Enterprise',
    monthlyPrice: 'Custom',
    annualPrice: 'Custom',
    tagline: 'For large organizations',
    isPopular: false,
    ctaText: 'Contact Sales',
    ctaVariant: 'enterprise',
    features: [
      { text: 'Unlimited everything', included: true },
      { text: 'Data residency', included: true },
      { text: 'Dedicated CSM', included: true },
      { text: 'Custom SLA', included: true },
      { text: 'On-prem option', included: true },
      { text: 'HIPAA ready', included: true },
    ],
  },
];

const faqs = [
  { q: 'How does billing work?', a: 'We bill monthly or annually. Annual plans get 20% off. No hidden fees.' },
  { q: 'Can I change plans later?', a: 'Yes, upgrade or downgrade anytime. Changes take effect on your next billing cycle.' },
  { q: 'What integrations do you support?', a: 'We support 50+ AI providers including OpenAI, Anthropic, Google, Azure, and more.' },
  { q: 'Is my data secure?', a: 'Yes. We use AES-256 encryption, TLS 1.3, and are SOC 2 Type II compliant.' },
  { q: 'Do you offer a free trial?', a: 'All plans come with a 14-day free trial. No credit card required to start.' },
  { q: 'What happens if I exceed my limits?', a: 'We\u2019ll notify you before you hit a limit. You can upgrade or pay for overages.' },
];

const PricingSection: React.FC = () => {
  const sectionRef = useScrollReveal();
  const [isAnnual, setIsAnnual] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

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

              <button className={`${styles.planCta} ${styles[plan.ctaVariant]}`}>
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
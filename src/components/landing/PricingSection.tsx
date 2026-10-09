import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './PricingSection.module.css';

export const PricingSection: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/public/pricing-plans')
      .then(res => res.json())
      .then(data => {
        if (!cancelled) {
          if (data.data && data.data.length > 0) {
            setPlans(data.data);
          }
          setLoading(false);
        }
      })
      .catch(err => {
        console.error('[PricingSection] Failed to load pricing:', err);
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  return (
    <section className={styles.section} id="pricing">
      <div className={styles.header}>
        <h2 className={styles.title}>Simple, transparent plans for any scale</h2>
        <p className={styles.sub}>No hidden seat fees. Start with a 14-day free trial.</p>
        
        <div style={{ display: 'inline-flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '8px', marginTop: '1.5rem', border: '1px solid var(--color-border, rgba(255,255,255,0.1))' }}>
          <button
            type="button"
            onClick={() => setBillingCycle('monthly')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: billingCycle === 'monthly' ? 'var(--color-primary, #6366f1)' : 'transparent',
              color: billingCycle === 'monthly' ? '#fff' : 'var(--color-text-secondary, #94a3b8)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setBillingCycle('annual')}
            style={{
              padding: '6px 16px',
              borderRadius: '6px',
              border: 'none',
              background: billingCycle === 'annual' ? 'var(--color-primary, #6366f1)' : 'transparent',
              color: billingCycle === 'annual' ? '#fff' : 'var(--color-text-secondary, #94a3b8)',
              fontWeight: 500,
              cursor: 'pointer',
              fontSize: '0.875rem',
              transition: 'all 0.2s ease'
            }}
          >
            Annual <span style={{ fontSize: '0.75rem', color: billingCycle === 'annual' ? '#e0e7ff' : '#10b981', marginLeft: '4px' }}>(Save up to 20%)</span>
          </button>
        </div>
      </div>

      <div className={styles.grid}>
        {loading ? (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Loading pricing plans...
          </div>
        ) : plans.length > 0 ? (
          plans.map(plan => {
            const price = billingCycle === 'annual' ? plan.price_annual : plan.price_monthly;
            const isEnterprise = plan.slug === 'enterprise';
            const isBasic = plan.slug === 'basic';
            return (
              <div key={plan.id} className={`${styles.card} ${plan.is_popular ? styles.cardFeatured : ''}`}>
                {plan.is_popular && <span className={styles.featuredBadge}>Recommended</span>}
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.price}>
                  {isEnterprise
                    ? <span style={{ fontSize: '22px', lineHeight: 1.3 }}>Contact Sales<br/><span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-tertiary)' }}>/ Custom</span></span>
                    : <><sup>$</sup>{isBasic ? '0' : price}</>}
                </div>
                <div className={styles.tagline}>
                  {isEnterprise ? 'Custom pricing for your organization' : isBasic ? 'Free forever' : billingCycle === 'annual' ? 'Billed annually' : 'Billed monthly'}
                </div>
                <hr className={styles.divider} />
                <ul className={styles.features}>
                  {plan.display_features?.map((feature: any, idx: number) => {
                    const text = typeof feature === 'string' ? feature : feature.text;
                    const excluded = typeof feature === 'object' && feature.included === false;
                    return (
                      <li key={idx} className={styles.featureItem} style={{ opacity: excluded ? 0.4 : 1 }}>
                        <span className={styles.featureDot}>—</span>
                        <span>{text}</span>
                      </li>
                    );
                  })}
                </ul>
                {isEnterprise ? (
                  <Link to="/contact-sales" className={styles.btnSecondary}>
                    {plan.cta_text || 'Contact Sales'}
                  </Link>
                ) : (
                  <Link
                    to={`/auth/signup?plan=${plan.slug}`}
                    className={plan.is_popular ? styles.btnPrimary : styles.btnSecondary}
                  >
                    {plan.cta_text || 'Connect Your First API Key'}
                  </Link>
                )}
              </div>
            );
          })
        ) : (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0' }}>
            <p style={{ color: 'var(--color-text-tertiary)', marginBottom: '16px' }}>Pricing options available upon signup.</p>
            <Link to="/auth/signup" className={styles.btnPrimary} style={{ display: 'inline-block', width: 'auto' }}>
              Get Started
            </Link>
          </div>
        )}
      </div>
    </section>
  );
};

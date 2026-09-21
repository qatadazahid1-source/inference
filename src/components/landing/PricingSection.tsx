import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import styles from './PricingSection.module.css';

export const PricingSection: React.FC = () => {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
      </div>

      <div className={styles.grid}>
        {loading ? (
          <div style={{ textAlign: 'center', gridColumn: '1 / -1', padding: '40px 0', color: 'var(--color-text-tertiary)', fontFamily: 'var(--font-mono)' }}>
            Loading pricing plans...
          </div>
        ) : plans.length > 0 ? (
          plans.map(plan => {
            const isCustom = Number(plan.price_monthly) === 0 && Number(plan.price_annual) === 0;
            const isEnterprise = plan.slug === 'enterprise';
            return (
              <div key={plan.id} className={`${styles.card} ${plan.is_popular ? styles.cardFeatured : ''}`}>
                {plan.is_popular && <span className={styles.featuredBadge}>Recommended</span>}
                <div className={styles.planName}>{plan.name}</div>
                <div className={styles.price}>
                  {isCustom ? 'Custom' : <><sup>$</sup>{plan.price_monthly}</>}
                </div>
                <div className={styles.tagline}>{plan.tagline || 'Billed monthly'}</div>
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

import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './TrustBar.module.css';

interface Company {
  name: string;
}

const companies: Company[] = [
  {name:'Stripe'},{name:'Airbnb'},
  {name:'Shopify'},{name:'Notion'},
  {name:'Figma'},{name:'Vercel'},{name:'Discord'},
];

const TrustBar: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.bar} reveal`}>
      <div className={styles.inner}>
        <p className={styles.label}>
          Trusted by engineering and finance teams at
        </p>
        <div className={styles.companies}>
          {companies.map((company, i) => (
            <React.Fragment key={company.name}>
              <span className={styles.company}>{company.name}</span>
              {i < companies.length - 1 && <div className={styles.divider} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

import React from 'react';

export default TrustBar;
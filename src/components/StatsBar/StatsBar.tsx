import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import useCountUp from '../../hooks/useCountUp';
import styles from './StatsBar.module.css';

interface StatItem {
  target: number;
  prefix: string;
  suffix: string;
  label: string;
}

const statsData: StatItem[] = [
  {target:2.4,prefix:'$',suffix:'B+',label:'AI Spend Tracked'},
  {target:32,prefix:'',suffix:'%',label:'Average Cost Reduction'},
  {target:450,prefix:'',suffix:'+',label:'Global Enterprises'},
  {target:2,prefix:'<',suffix:'ms',label:'Alert Response Time'},
];

const StatsBar: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.bar} dotGrid reveal`}>
      <div className={styles.inner}>
        <div className={styles.stats}>
          {statsData.map((stat, i) => (
            <React.Fragment key={stat.label}>
              <StatItem {...stat} />
              {i < statsData.length - 1 && <div className={styles.divider} />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

const StatItem: React.FC<StatItem> = ({ target, prefix, suffix, label }) => {
  const { ref, display } = useCountUp({ target, prefix, suffix, duration: 1500 });
  
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>} className={styles.stat}>
      <span className={styles.number}>{display}</span>
      <span className={styles.label}>{label}</span>
    </div>
  );
};

export default StatsBar;
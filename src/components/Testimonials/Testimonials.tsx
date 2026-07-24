import React from 'react';
import useScrollReveal from '../../hooks/useScrollReveal';
import styles from './Testimonials.module.css';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
  company: string;
  initials: string;
  avatarGradient: string;
}

const testimonials: Testimonial[] = [
  {
    quote:'"We found $31,000 in monthly waste in our first week. The ROI paid for itself in 6 hours."',
    name:'Alex R.',
    role:'Head of AI Infrastructure',
    company:'Nexus Corp',
    initials:'AR',
    avatarGradient:'linear-gradient(135deg, #1A6EF0,#06A3C8)',
  },
  {
    quote:'"I can walk into a board meeting with a real number. Not a guess. A defensible, data-backed ROI figure."',
    name:'Sarah K.',
    role:'CIO',
    company:'Meridian Financial',
    initials:'SK',
    avatarGradient:'linear-gradient(135deg, #0EA472,#06A3C8)',
  },
  {
    quote:'"Our API costs dropped 34% in 60 days by seeing which models were actually used in production vs staging."',
    name:'Marcus T.',
    role:'VP Engineering',
    company:'DataFlow Inc',
    initials:'MT',
    avatarGradient:'linear-gradient(135deg, #E58C0A,#E5484D)',
  },
  {
    quote:'"Anomaly detection caught a GPT-4 loop at 2AM that would have cost $12,000. Alert arrived in under 90 seconds."',
    name:'Priya M.',
    role:'Platform Lead',
    company:'CloudScale',
    initials:'PM',
    avatarGradient:'linear-gradient(135deg, #1A6EF0,#0EA472)',
  },
  {
    quote:'"I now tell my CFO exactly which department is using which AI tool and what return they\'re generating."',
    name:'James L.',
    role:'Engineering Director',
    company:'Vertex Labs',
    initials:'JL',
    avatarGradient:'linear-gradient(135deg, #06A3C8,#1A6EF0)',
  },
  {
    quote:'"Setup was 8 minutes. Within the hour we found $8,400 in monthly spend that was completely unattributed."',
    name:'Chen W.',
    role:'DevOps Lead',
    company:'Pragma Systems',
    initials:'CW',
    avatarGradient:'linear-gradient(135deg, #E5484D,#E58C0A)',
  },
];

const Testimonials: React.FC = () => {
  const sectionRef = useScrollReveal();

  return (
    <section ref={sectionRef} className={`${styles.section} reveal`}>
      <div className={styles.container}>
        <div className={styles.marqueeTrack}>
          <div className={`${styles.marqueeInner} ${styles.scrollLeft}`}>
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className={styles.card}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.quote}>{t.quote}</p>
                <div className={styles.author}>
                  <div
                    className={styles.avatar}
                    style={{ background: t.avatarGradient }}
                  >
                    {t.initials}
                  </div>
                  <div className={styles.authorInfo}>
                    <span className={styles.authorName}>{t.name}</span>
                    <span className={styles.authorRole}>{t.role}, {t.company}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className={styles.marqueeTrack}>
          <div className={`${styles.marqueeInner} ${styles.scrollRight}`}>
            {[...testimonials, ...testimonials].map((t, i) => (
              <div key={i} className={styles.card}>
                <div className={styles.stars}>★★★★★</div>
                <p className={styles.quote}>{t.quote}</p>
                <div className={styles.author}>
                  <div
                    className={styles.avatar}
                    style={{ background: t.avatarGradient }}
                  >
                    {t.initials}
                  </div>
                  <div className={styles.authorInfo}>
                    <span className={styles.authorName}>{t.name}</span>
                    <span className={styles.authorRole}>{t.role}, {t.company}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
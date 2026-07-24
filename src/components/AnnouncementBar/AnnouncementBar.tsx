import { useState } from 'react';
import styles from './AnnouncementBar.module.css';

const AnnouncementBar: React.FC = () => {
  const [visible, setVisible] = useState(() => {
    return !sessionStorage.getItem('bar_closed');
  });

  if (!visible) return null;

  return (
    <div className={styles.bar}>
      <div className={styles.inner}>
        <span className={styles.dot} />
        <span className={styles.text}>
          🎉  Groq integration is live — 
          Start tracking inference costs in real time
        </span>
        <a href="#" className={styles.link}>
          See what's new →
        </a>
      </div>
      <button
        className={styles.close}
        onClick={() => {
          setVisible(false);
          sessionStorage.setItem('bar_closed', '1');
        }}
        aria-label="Close"
      >
        ×
      </button>
    </div>
  );
};

export default AnnouncementBar;
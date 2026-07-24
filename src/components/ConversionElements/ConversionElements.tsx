import { useState, useEffect } from 'react';
import styles from './ConversionElements.module.css';

const ConversionElements: React.FC = () => {
  const [showBar, setShowBar] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [showCookie, setShowCookie] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    setShowBar(!sessionStorage.getItem('bar_v2'));
    setShowCookie(!sessionStorage.getItem('cookie_v2'));
  }, []);

  useEffect(() => {
    let canShow = false
    const timer = setTimeout(() => {
      canShow = true
    }, 8000)

    const onLeave = (e: MouseEvent) => {
      // clientY <= 0 alone also fires when the user moves toward the
      // browser's own tab bar / URL bar to switch tabs — not just when
      // they're actually about to leave the site. Requiring the document
      // to still report focus (true exit-intent keeps focus until the
      // very last moment; a tab switch blurs it first) filters that out.
      if (
        e.clientY <= 0 &&
        document.hasFocus() &&
        canShow &&
        !sessionStorage.getItem('exit_shown')
      ) {
        setShowPopup(true)
        sessionStorage.setItem('exit_shown', '1')
      }
    }

    document.addEventListener('mouseleave', onLeave)

    return () => {
      document.removeEventListener('mouseleave', onLeave)
      clearTimeout(timer)
    }
  }, [])

  const acceptCookies = () => {
    setShowCookie(false);
    sessionStorage.setItem('cookie_v2', '1');
  };

  const closePopup = () => setShowPopup(false);

  return (
    <>
      {showCookie && (
        <div className={styles.cookieBanner}>
          <p className={styles.cookieText}>
            We use cookies to improve your experience. By using Inference Intelligence, you agree to our use of cookies.
          </p>
          <button className={styles.cookieBtn} onClick={acceptCookies}>
            Accept
          </button>
        </div>
      )}

      {showPopup && (
        <div className={styles.overlay} onClick={closePopup}>
          <div className={styles.popup} onClick={e => e.stopPropagation()}>
            <button className={styles.popupClose} onClick={closePopup}>×</button>
            <h3 className={styles.popupTitle}>Wait! Don't leave money on the table</h3>
            <p className={styles.popupSub}>
              Get a personalized ROI analysis for your company — free.
            </p>
            <form className={styles.popupForm} onSubmit={e => { e.preventDefault(); closePopup(); }}>
              <input
                type="email"
                placeholder="Enter your work email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                className={styles.popupInput}
                required
              />
              <button type="submit" className={styles.popupBtn}>
                Get My Free Analysis
              </button>
            </form>
          </div>
        </div>
      )}

      {showBar && (
        <div className={styles.mobileBar}>
          <a href="#" className={styles.mobileBtn}>
            Start Free Trial
          </a>
        </div>
      )}
    </>
  );
};

export default ConversionElements;
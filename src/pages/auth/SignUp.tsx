import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { signInWithGoogle } from '../../lib/auth';
import styles from '../../components/auth/AuthLayout.module.css';

const benefits = [
  { icon: '\u26A1', text: 'Track AI costs across every provider in real time' },
  { icon: '\uD83D\uDCCA', text: 'Auto-generate ROI reports for your board' },
  { icon: '\uD83D\uDD14', text: 'Get alerts before AI spend exceeds budget' },
];

export function SignUp() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignUp = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch {
      setError('Failed to sign up. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.card}>
        <div className={styles.logoRow}>
          <div className={styles.logoMark}>II</div>
          <span className={styles.logoText}>Inference Intelligence</span>
        </div>

        <h1 className={styles.heading}>Get started for free</h1>
        <p className={styles.subtext}>Join teams already tracking their AI ROI</p>

        {error && <div className={styles.errorBanner}>{error}</div>}

        <button
          className={styles.googleBtn}
          onClick={handleSignUp}
          disabled={isLoading}
          aria-busy={isLoading}
        >
          {isLoading ? (
            <>
              <Spinner size="sm" />
              Signing up...
            </>
          ) : (
            <>
              <svg className={styles.googleIcon} viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Sign up with Google
            </>
          )}
        </button>

        <div className={styles.divider}>
          <span className={styles.dividerLine} />
          <span>secure OAuth 2.0</span>
          <span className={styles.dividerLine} />
        </div>

        <div className={styles.benefits}>
          {benefits.map((b) => (
            <div key={b.text} className={styles.benefitItem}>
              <span className={styles.benefitIcon}>{b.icon}</span>
              <span>{b.text}</span>
            </div>
          ))}
        </div>

        <p className={styles.terms}>
          By signing up, you agree to our Terms of Service and Privacy Policy.
        </p>

        <p className={styles.footer}>
          Already have an account?{' '}
          <Link to="/auth/signin" className={styles.footerLink}>Sign in</Link>
        </p>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import { Seo } from '../components/seo/Seo';
import styles from './StaticPage.module.css';

/**
 * Real 404 page (SEO-26 / M2B).
 *
 * Replaces the previous catch-all that silently redirected unknown URLs to "/"
 * (a soft-404 that told crawlers a missing page was a valid 200 homepage).
 * This component renders a genuine "not found" view and, crucially, emits
 * `noindex,follow` through the existing <Seo /> system so search engines drop
 * the URL from their index while still following links back into the site.
 *
 * It is reused in two places:
 *   1. App.tsx catch-all route ("*") for structurally-unknown paths.
 *   2. StaticPage's "not-found" state, when a single-segment /:slug isn't a
 *      published CMS page — so those also return a proper noindex 404 view.
 */
export default function NotFound() {
  return (
    <div className={styles.page}>
      <Seo
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        robots="noindex,follow"
        ogType="website"
      />
      <div className={styles.wrap}>
        <p className={styles.eyebrow}>404</p>
        <h1 className={styles.title}>Page not found</h1>
        <p className={styles.statusText}>
          The page you're looking for doesn't exist or has moved.
        </p>
        <Link to="/" className={styles.homeLink}>← Back to home</Link>
      </div>
    </div>
  );
}

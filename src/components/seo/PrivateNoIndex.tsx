import { useSeo } from '../../hooks/useSeo';

/**
 * Applies a `noindex,nofollow` robots directive for PRIVATE areas of the app
 * (dashboard, settings, admin, auth, onboarding). These routes must never be
 * indexed by search engines, and they are also excluded from robots.txt and
 * sitemap.xml.
 *
 * Because this is a client-rendered SPA, robots.txt already prevents crawling
 * of these paths; this component is defence-in-depth so that if a private URL
 * is ever fetched directly, the emitted <meta name="robots"> tells crawlers
 * not to index it. It also clears any inherited public canonical.
 *
 * Renders nothing to the DOM.
 */
export function PrivateNoIndex(): null {
    useSeo({ robots: 'noindex,nofollow' });
    return null;
}

export default PrivateNoIndex;

import { useSeo, type SeoProps } from '../../hooks/useSeo';

/**
 * Declarative wrapper around the {@link useSeo} hook so public pages can drop
 * SEO metadata straight into their JSX:
 *
 *   <Seo title="Pricing" description="…" ogType="website" />
 *
 * Renders nothing to the DOM — it only manages <head> tags for the lifetime of
 * the page. Use ONLY on public, indexable routes. See {@link PrivateNoIndex}
 * for dashboard/admin/auth/settings areas.
 */
export function Seo(props: SeoProps): null {
    useSeo(props);
    return null;
}

export default Seo;

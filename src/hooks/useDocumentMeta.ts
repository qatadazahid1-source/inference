import { useEffect } from 'react';

const DEFAULT_TITLE = 'Ordisum — AI API Cost Management';
const DEFAULT_DESCRIPTION = 'Real-time observability for your AI API spend — across every provider, every model, every team.';

/**
 * Sets document.title and the <meta name="description"> tag for the
 * lifetime of the calling component, restoring the previous values on
 * unmount. This is how every route in a client-rendered SPA gets its own
 * title/description for search results and browser tabs, since there's
 * no per-route server render to set them statically.
 */
export function useDocumentMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    const prevTitle = document.title;
    const metaEl = document.querySelector('meta[name="description"]');
    const prevDescription = metaEl?.getAttribute('content') ?? '';

    document.title = title?.trim() || DEFAULT_TITLE;

    if (metaEl) {
      metaEl.setAttribute('content', description?.trim() || DEFAULT_DESCRIPTION);
    }

    return () => {
      document.title = prevTitle;
      if (metaEl) metaEl.setAttribute('content', prevDescription);
    };
  }, [title, description]);
}

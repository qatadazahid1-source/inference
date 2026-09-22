// Polyfill Object.hasOwn for older Chromium environments (used by react-snap).
// Guard ensures native implementations are never overwritten.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (typeof (Object as any).hasOwn !== 'function') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (Object as any).hasOwn = function (obj: object, prop: PropertyKey): boolean {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };
}

import React from 'react'
import { hydrateRoot, createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { OrganizationProvider } from './context/OrganizationContext'
import { ToastProvider } from './components/ui/Toast/Toast'
import { EntitlementsProvider } from './context/EntitlementsContext'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { queryClient } from './lib/queryClient'
import './index.css'

const rootEl = document.getElementById('root')!

// Inject Plausible Analytics only if configured
if (import.meta.env.VITE_PLAUSIBLE_DOMAIN) {
  const script = document.createElement('script');
  script.defer = true;
  script.dataset.domain = import.meta.env.VITE_PLAUSIBLE_DOMAIN;
  script.src = 'https://plausible.io/js/script.js';
  document.head.appendChild(script);
}

const app = (
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <AuthProvider>
            <OrganizationProvider>
              <EntitlementsProvider>
                <ToastProvider>
                  <App />
                </ToastProvider>
              </EntitlementsProvider>
            </OrganizationProvider>
          </AuthProvider>
        </BrowserRouter>
        {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
)

// If the URL contains an OAuth callback token (e.g. Supabase redirected here with
// #access_token=... instead of to /auth/callback), react-snap's pre-rendered HTML
// will be stale/wrong — hydrating it causes React errors #418 and #423.
// In that case, always do a fresh createRoot render to avoid the mismatch.
const hasOAuthHash = window.location.hash.includes('access_token') ||
  window.location.hash.includes('error_description');

if (!hasOAuthHash && rootEl.hasChildNodes()) {
  // Normal hydration path — pre-rendered HTML matches current render
  try {
    hydrateRoot(rootEl, app);
  } catch {
    // Hydration failed (stale snapshot) — clear and re-render cleanly
    rootEl.innerHTML = '';
    createRoot(rootEl).render(app);
  }
} else {
  // Either OAuth callback or no pre-rendered HTML — always fresh render
  createRoot(rootEl).render(app);
}

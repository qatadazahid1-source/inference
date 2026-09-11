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
  </React.StrictMode>
)

if (rootEl.hasChildNodes()) {
  hydrateRoot(rootEl, app)
} else {
  createRoot(rootEl).render(app)
}

import React from 'react'
import ReactDOM from 'react-dom/client'
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

ReactDOM.createRoot(document.getElementById('root')!).render(
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
  </React.StrictMode>,
)

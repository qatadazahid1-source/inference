import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite handles SPA fallback automatically — no historyApiFallback needed
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true
      },
      // ── Sitemap authority (SEO-26) ───────────────────────────────────
      // robots.txt advertises the canonical sitemap at the site root
      // (/sitemap.xml), but the authoritative, CMS-aware generator lives
      // on the backend at /api/public/sitemap.xml. In dev we rewrite the
      // root path to the generator so the advertised URL is authoritative.
      // The static public/sitemap.xml remains a fail-soft baseline that is
      // served only if no equivalent rewrite exists at the production edge
      // (see Manual Production Steps in the final report).
      '/sitemap.xml': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        rewrite: () => '/api/public/sitemap.xml'
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        // ── Manual vendor chunking (SEO-25) ──────────────────────────
        // Split only heavy, route-specific libraries into their own
        // vendor chunks so public/marketing routes don't download
        // dashboard/admin dependencies. React itself stays in the main
        // vendor chunk (shared by every route). We intentionally avoid
        // dozens of micro-chunks — only libraries with real weight and
        // limited route usage are separated.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined

          // Charting — used only by dashboard/analytics/benchmarks.
          if (id.includes('recharts') || id.includes('d3-')) {
            return 'vendor-charts'
          }

          // PDF / spreadsheet export — used only by reports/export flows.
          if (
            id.includes('jspdf') ||
            id.includes('jspdf-autotable') ||
            id.includes('html2canvas') ||
            id.includes('xlsx')
          ) {
            return 'vendor-export'
          }

          // Animation library — used across landing + some interactive UI.
          if (id.includes('framer-motion')) {
            return 'vendor-motion'
          }

          // React core + router — shared everywhere, keep together.
          if (
            id.includes('react-router') ||
            id.includes('/react/') ||
            id.includes('/react-dom/') ||
            id.includes('/scheduler/')
          ) {
            return 'vendor-react'
          }

          return undefined
        }
      }
    }
  }
})

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
      }
    }
  }
})
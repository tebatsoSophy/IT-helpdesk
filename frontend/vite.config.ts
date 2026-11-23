import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// In development the API runs on :8080; proxying keeps the browser on a single origin (no CORS needed).
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: { manualChunks: { charts: ['recharts'], vendor: ['react', 'react-dom', 'react-router-dom', '@tanstack/react-query'] } },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET ?? 'http://localhost:8080', changeOrigin: true },
    },
  },
})

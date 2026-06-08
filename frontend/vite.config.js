import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The dev server proxies /api requests to the Flask backend on port 5000,
// so the frontend and backend can run side by side during development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})

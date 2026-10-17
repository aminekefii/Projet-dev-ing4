import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Django runs on :8000. API_TARGET overrides it (Docker dev: http://host.docker.internal:8000).
// The Host header is left as-is so Django's CSRF origin check sees the page's own origin.
const apiTarget = process.env.API_TARGET ?? 'http://127.0.0.1:8000'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: apiTarget },
    },
  },
})

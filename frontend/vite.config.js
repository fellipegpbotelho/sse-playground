import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy all API calls to the FastAPI backend running on :8000.
// This lets the Vite dev server (port 5173) talk to FastAPI without CORS issues.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/stream':      'http://localhost:8000',
      '/trigger-log': 'http://localhost:8000',
      '/broadcast':   'http://localhost:8000',
    },
  },
})

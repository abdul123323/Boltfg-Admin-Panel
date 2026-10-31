import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Dev mein /api requests backend (localhost:5000) ko proxy hoti hain, is se CORS ka masla nahi aata.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: process.env.VITE_PROXY_TARGET || 'http://localhost:5000', changeOrigin: true },
    },
  },
});

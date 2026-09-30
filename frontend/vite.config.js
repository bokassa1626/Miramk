import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// En développement, /api est relayé vers le backend Node.js (aucun secret dans le frontend)
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:4000', changeOrigin: true } },
  },
});

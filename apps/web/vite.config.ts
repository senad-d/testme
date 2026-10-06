import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  envPrefix: 'MOBEY_PUBLIC_',
  build: {
    emptyOutDir: true,
    outDir: 'dist',
  },
  server: {
    proxy: {
      '/api': {
        // Server-only: never exposed through the MOBEY_PUBLIC_ browser prefix.
        target: process.env['API_PROXY_TARGET'] ?? 'http://127.0.0.1:3000',
      },
    },
  },
});

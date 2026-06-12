import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: './',
  server: { host: true },
  build: {
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      input: {
        landing: resolve(__dirname, 'index.html'),
        city: resolve(__dirname, 'city.html'),
      },
    },
  },
});

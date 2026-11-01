import { fileURLToPath } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react(), tailwindcss()],

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },

  build: {
    // The content security policy allows fonts and images from this site only (TD-029), and a
    // `data:` address is not this site. No asset is turned into one.
    assetsInlineLimit: 0,
  },

  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Style files are not processed in tests, except when a test reads one as text (`?raw`),
    // as the design token tests do.
    css: { include: [/\.css\?raw$/] },
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      reporter: ['text', 'html'],
    },
  },
});

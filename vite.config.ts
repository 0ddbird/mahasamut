/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    // The contact service (npm run dev:server) answers /api/contact in development.
    proxy: { '/api': 'http://127.0.0.1:3001' },
  },
  build: {
    // The SSR build bundles the contact service: it has no use for the public folder.
    copyPublicDir: !isSsrBuild,
    // The main chunk is just over Vite's default 500 kB since it bundles the
    // pool of real words for Find the tone (about 55 kB). Splitting the routes
    // into their own chunks is left for later.
    chunkSizeWarningLimit: 600,
  },
  test: {
    // Two kinds of tests, told apart by their file extension:
    // - logic (*.test.ts) runs in Node, with no DOM and no React;
    // - components (*.test.tsx) run in jsdom, with Testing Library set up once.
    projects: [
      {
        extends: true,
        test: {
          name: 'logic',
          include: ['src/**/*.test.ts', 'tools/**/*.test.ts', 'server/**/*.test.ts'],
          environment: 'node',
        },
      },
      {
        extends: true,
        test: {
          name: 'components',
          include: ['src/**/*.test.tsx'],
          environment: 'jsdom',
          setupFiles: ['./src/setup-component-tests.ts'],
        },
      },
    ],
  },
}));

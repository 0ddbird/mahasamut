/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  server: {
    // In development, /api (contact, event) and /socket.io go to the unified server (port 3002).
    proxy: {
      '/api': 'http://127.0.0.1:3002',
      '/socket.io': {
        target: 'http://127.0.0.1:3002',
        ws: true,
      },
    },
  },
  ssr: {
    // Bundle npm dependencies (such as socket.io) into the built server so a
    // release on the VPS runs with `/usr/bin/node` without node_modules.
    noExternal: true,
  },
  build: {
    // The SSR build bundles the unified server: it has no use for the public folder.
    copyPublicDir: !isSsrBuild,
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

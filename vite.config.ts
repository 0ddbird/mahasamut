/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // Two kinds of tests, told apart by their file extension:
    // - logic (*.test.ts) runs in Node, with no DOM and no React;
    // - components (*.test.tsx) run in jsdom, with Testing Library set up once.
    projects: [
      {
        extends: true,
        test: {
          name: 'logic',
          include: ['src/**/*.test.ts', 'home/**/*.test.ts'],
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
});

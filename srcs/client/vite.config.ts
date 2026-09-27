/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  // SERVER_URL is set by compose; outside Docker the server listens on PORT from the root .env.
  const { SERVER_URL, PORT } = loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '');

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      fs: { allow: ['..'] },
      proxy: {
        '/socket.io': {
          target: SERVER_URL || `http://localhost:${PORT || 3000}`,
          ws: true,
        },
      },
    },
    build: {
      emptyOutDir: true,
      rolldownOptions: {
        output: { entryFileNames: 'bundle.js' },
      },
    },
    test: {
      environment: 'jsdom',
      include: ['tests/**/*.test.{ts,tsx}'],
      setupFiles: ['tests/setup.ts'],
      coverage: {
        provider: 'v8',
        include: ['src/**/*.{ts,tsx}'],
        exclude: ['src/main.tsx'],
        thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
      },
    },
  };
});

/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  // Project root locally, / in Docker: holds .env and certs/.
  // SERVER_URL and DEV_PORT come from compose; outside Docker, PORT from .env and Vite on 5173.
  const root = new URL('../../', import.meta.url);
  const { SERVER_URL, PORT, DEV_PORT } = loadEnv(mode, fileURLToPath(root), '');
  const https =
    command === 'serve' && mode !== 'test'
      ? {
          key: readFileSync(new URL('certs/key.pem', root)),
          cert: readFileSync(new URL('certs/cert.pem', root)),
        }
      : undefined;

  return {
    plugins: [react()],
    server: {
      host: true,
      port: Number(DEV_PORT) || 5173,
      https,
      fs: { allow: ['..'] },
      watch: { ignored: ['**/coverage/**'] }, // test runs would reload the page
      proxy: {
        '/socket.io': {
          target: SERVER_URL || `https://localhost:${PORT || 3000}`,
          ws: true,
          secure: false, // self-signed certificate
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
        include: ['src/**/*.{ts,tsx}', '**/shared/game/**/*.ts'],
        exclude: ['src/main.tsx'],
        allowExternal: true, // shared/game holds the pure rules used by both packages
        thresholds: { statements: 70, functions: 70, lines: 70, branches: 50 },
      },
    },
  };
});

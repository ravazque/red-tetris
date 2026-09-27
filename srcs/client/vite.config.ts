/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ command, mode }) => {
  // Project root locally, / in Docker: holds .env and certs/ (bind mount).
  const root = new URL('../../', import.meta.url);
  // SERVER_URL is set by compose; outside Docker the server listens on PORT from the root .env.
  const { SERVER_URL, PORT } = loadEnv(mode, fileURLToPath(root), '');
  // The dev server is HTTPS only; builds and tests do not need the certificate.
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
      port: 5173,
      https,
      fs: { allow: ['..'] },
      proxy: {
        '/socket.io': {
          target: SERVER_URL || `https://localhost:${PORT || 3000}`,
          ws: true,
          // The server uses the same self-signed certificate.
          secure: false,
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

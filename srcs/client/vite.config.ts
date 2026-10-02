/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

// Dev server only: a URL with malformed %-escapes gets Vite's 404 page; send it home like the production server does.
const malformedToHome: Plugin = {
  name: 'malformed-url-to-home',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      try {
        decodeURI(req.url ?? '/');
        next();
      } catch {
        res.writeHead(302, { Location: '/' }).end();
      }
    });
  },
};

// Dev server only: LAN_HOST (this computer on the local network, from the Makefile) printed for other computers and given to the page
// for invite links, as the production server does. In Docker (SERVER_URL) or with LAN_HOST, Vite's Network line is dropped: a container address.
const lanHost = (host = process.env.LAN_HOST ?? '', docker = Boolean(process.env.SERVER_URL)): Plugin => {
  const valid = /^[A-Za-z0-9.-]+$/.test(host);
  return {
    name: 'lan-host',
    apply: 'serve',
    configureServer(server) {
      const printUrls = server.printUrls.bind(server);
      server.printUrls = () => {
        if ((docker || valid) && server.resolvedUrls) server.resolvedUrls.network = [];
        printUrls();
        if (valid) server.config.logger.info(`  ➜  Other computers: https://${host}:${server.config.server.port}/`);
      };
    },
    transformIndexHtml: () => (valid ? [{ tag: 'meta', attrs: { name: 'lan-host', content: host }, injectTo: 'head' }] : []),
  };
};

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
    plugins: [react(), malformedToHome, lanHost()],
    server: {
      host: true,
      port: Number(DEV_PORT) || 5173,
      https,
      fs: { allow: ['..'] },
      watch: { ignored: ['**/coverage/**'] }, // test runs would reload the page
      proxy: {
        '/socket.io': {
          target: SERVER_URL || `https://localhost:${PORT || 4242}`,
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

import { readFileSync } from 'node:fs';
import path from 'node:path';
import express from 'express';

const defaultPublicDir = path.resolve(import.meta.dirname, '../../../client/dist');

// Client build as static files; any other page load gets index.html and the SPA router cleans or rejects the URL.
// A plain middleware, not a '/{*path}' route: route params get decoded, so malformed %-escapes would end in a 400 page.
// LAN_HOST (this computer on the local network, from the Makefile) goes into the page: opened on localhost, invite links use it.
export const createApp = (publicDir = defaultPublicDir, lanHost = process.env.LAN_HOST ?? '') => {
  const app = express();
  const host = /^[A-Za-z0-9.-]+$/.test(lanHost) ? lanHost : null;
  let page: string | undefined;
  app.use(express.static(publicDir, { index: false }));
  app.use((req, res, next) => {
    // Missing assets 404; page loads (Accept: text/html) get the SPA even with a dot in the name.
    if ((req.method !== 'GET' && req.method !== 'HEAD') || (path.extname(req.path) && !req.get('accept')?.includes('text/html'))) {
      next();
      return;
    }
    if (!host) {
      res.sendFile(path.join(publicDir, 'index.html'));
      return;
    }
    page ??= readFileSync(path.join(publicDir, 'index.html'), 'utf8').replace('</head>', `<meta name="lan-host" content="${host}" /></head>`);
    res.type('html').send(page);
  });
  return app;
};

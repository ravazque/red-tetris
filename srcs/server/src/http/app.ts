import path from 'node:path';
import express from 'express';

const defaultPublicDir = path.resolve(import.meta.dirname, '../../../client/dist');

// Client build as static files; any other page load gets index.html and the SPA router cleans or rejects the URL.
// A plain middleware, not a '/{*path}' route: route params get decoded, so malformed %-escapes would end in a 400 page.
export const createApp = (publicDir = defaultPublicDir) => {
  const app = express();
  app.use(express.static(publicDir));
  app.use((req, res, next) => {
    // Missing assets 404; page loads (Accept: text/html) get the SPA even with a dot in the name.
    if ((req.method !== 'GET' && req.method !== 'HEAD') || (path.extname(req.path) && !req.get('accept')?.includes('text/html'))) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  return app;
};

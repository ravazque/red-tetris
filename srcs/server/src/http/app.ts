import path from 'node:path';
import express from 'express';

const defaultPublicDir = path.resolve(import.meta.dirname, '../../../client/dist');

// Client build as static files; any other GET gets index.html for the SPA router.
export const createApp = (publicDir = defaultPublicDir) => {
  const app = express();
  app.use(express.static(publicDir));
  app.get('/{*path}', (req, res, next) => {
    // Missing assets 404; page loads (Accept: text/html) get the SPA even with a dot in the name.
    if (path.extname(req.path) && !req.get('accept')?.includes('text/html')) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  return app;
};

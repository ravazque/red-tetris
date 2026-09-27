import path from 'node:path';
import express from 'express';

const defaultPublicDir = path.resolve(import.meta.dirname, '../../../client/dist');

// Serves the client build (index.html, bundle.js, assets). Every other GET
// falls back to index.html so the SPA router handles /<room>/<player_name>.
export const createApp = (publicDir = defaultPublicDir) => {
  const app = express();
  app.use(express.static(publicDir));
  app.get('/{*path}', (req, res, next) => {
    // A missing asset gets a 404 instead of HTML; page loads (Accept: text/html)
    // still reach the SPA, even for player names containing a dot.
    if (path.extname(req.path) && !req.get('accept')?.includes('text/html')) {
      next();
      return;
    }
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  return app;
};

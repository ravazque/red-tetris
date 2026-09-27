import path from 'node:path';
import express from 'express';

const publicDir = path.resolve(import.meta.dirname, '../../../client/dist');

// Serves the client build (index.html, bundle.js, assets). Every other GET
// falls back to index.html so the SPA router handles /<room>/<player_name>.
export const createApp = () => {
  const app = express();
  app.use(express.static(publicDir));
  app.get('/{*path}', (_req, res) => {
    res.sendFile(path.join(publicDir, 'index.html'));
  });
  return app;
};

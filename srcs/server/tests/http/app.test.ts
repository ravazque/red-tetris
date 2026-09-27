import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../../src/http/app.ts';

const INDEX = '<!doctype html><div id="root"></div>';
const BUNDLE = 'console.log("bundle");';

describe('createApp', () => {
  let publicDir: string;
  let server: Server;
  let baseUrl: string;

  const get = (url: string, accept = '*/*') => fetch(baseUrl + url, { headers: { accept } });

  beforeAll(async () => {
    publicDir = mkdtempSync(path.join(tmpdir(), 'red-tetris-public-'));
    writeFileSync(path.join(publicDir, 'index.html'), INDEX);
    writeFileSync(path.join(publicDir, 'bundle.js'), BUNDLE);
    server = createApp(publicDir).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    baseUrl = `http://localhost:${(server.address() as AddressInfo).port}`;
  });

  afterAll(() => {
    server.close();
    rmSync(publicDir, { recursive: true, force: true });
  });

  it('serves index.html at the root', async () => {
    const res = await get('/');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(INDEX);
  });

  it('serves bundle.js as a static file', async () => {
    const res = await get('/bundle.js');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toMatch(/javascript/);
    expect(await res.text()).toBe(BUNDLE);
  });

  it('falls back to index.html for /<room>/<player_name>', async () => {
    const res = await get('/room1/alice');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(INDEX);
  });

  it('falls back to index.html for page loads of names containing a dot', async () => {
    const res = await get('/room1/john.doe', 'text/html,application/xhtml+xml');

    expect(res.status).toBe(200);
    expect(await res.text()).toBe(INDEX);
  });

  it('returns 404 for missing assets', async () => {
    expect((await get('/missing.js')).status).toBe(404);
    expect((await get('/favicon.ico', 'image/avif,image/webp,*/*')).status).toBe(404);
  });
});

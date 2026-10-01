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
    server = createApp(publicDir, '').listen(0);
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

  it('leaves URLs with malformed %-escapes to the SPA router', async () => {
    for (const url of ['/%E0%A4%A', '/%zz/alice', '/room1/%']) {
      const res = await get(url, 'text/html');

      expect(res.status).toBe(200);
      expect(await res.text()).toBe(INDEX);
    }
  });

  it('answers only GET and HEAD with the SPA', async () => {
    expect((await fetch(`${baseUrl}/room1/alice`, { method: 'HEAD' })).status).toBe(200);
    expect((await fetch(`${baseUrl}/room1/alice`, { method: 'POST' })).status).toBe(404);
  });

  it('returns 404 for missing assets', async () => {
    expect((await get('/missing.js')).status).toBe(404);
    expect((await get('/favicon.ico', 'image/avif,image/webp,*/*')).status).toBe(404);
  });
});

describe('createApp with LAN_HOST', () => {
  const PAGE = '<!doctype html><head><title>Red Tetris</title></head><div id="root"></div>';

  const serve = async (lanHost: string) => {
    const publicDir = mkdtempSync(path.join(tmpdir(), 'red-tetris-public-'));
    writeFileSync(path.join(publicDir, 'index.html'), PAGE);
    const server = createApp(publicDir, lanHost).listen(0);
    await new Promise((resolve) => server.once('listening', resolve));
    const url = `http://localhost:${(server.address() as AddressInfo).port}`;
    const pages = await Promise.all(['/', '/room1/alice'].map(async (page) => (await fetch(url + page)).text()));
    server.close();
    rmSync(publicDir, { recursive: true, force: true });
    return pages;
  };

  it('gives every page load the address other computers reach', async () => {
    const meta = '<meta name="lan-host" content="192.168.1.20" /></head>';

    expect(await serve('192.168.1.20')).toEqual([PAGE.replace('</head>', meta), PAGE.replace('</head>', meta)]);
  });

  it('serves the page untouched without a usable address', async () => {
    expect(await serve('')).toEqual([PAGE, PAGE]);
    expect(await serve('"><script>')).toEqual([PAGE, PAGE]);
  });
});

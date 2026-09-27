import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { connectClient, startSocketServer } from '../helpers/socketServer.ts';

describe('registerHandlers', () => {
  let server: Awaited<ReturnType<typeof startSocketServer>>;

  beforeAll(async () => {
    server = await startSocketServer();
  });

  afterAll(() => server.close());

  it('accepts socket connections', async () => {
    const client = await connectClient(server.url);

    expect(client.connected).toBe(true);
    expect(server.io.of('/').sockets.has(client.id!)).toBe(true);
    client.disconnect();
  });
});

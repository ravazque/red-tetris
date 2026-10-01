import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/protocol.ts';
import { registerHandlers } from '../../src/sockets/registerHandlers.ts';

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

// Same wiring as src/index.ts, on a random free port; tickMs sets the gravity interval, graceMs how long a dropped socket keeps its seat (short by default here).
export const startSocketServer = async (tickMs?: number, graceMs = 50) => {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  registerHandlers(io, tickMs, graceMs);
  await new Promise<void>((resolve) => httpServer.listen(0, resolve));
  const { port } = httpServer.address() as AddressInfo;

  return {
    io,
    url: `http://localhost:${port}`,
    close: () => new Promise<void>((resolve) => io.close(() => resolve())),
  };
};

export const connectClient = (url: string) =>
  new Promise<TestClient>((resolve, reject) => {
    const client: TestClient = connect(url, { transports: ['websocket'], forceNew: true });
    client.once('connect', () => resolve(client));
    client.once('connect_error', reject);
  });

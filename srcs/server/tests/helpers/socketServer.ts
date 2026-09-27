import { createServer } from 'node:http';
import type { AddressInfo } from 'node:net';
import { Server } from 'socket.io';
import { io as connect, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/protocol.ts';
import { registerHandlers } from '../../src/sockets/registerHandlers.ts';

export type TestClient = Socket<ServerToClientEvents, ClientToServerEvents>;

// Same wiring as src/index.ts, on a random free port.
export const startSocketServer = async () => {
  const httpServer = createServer();
  const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
  registerHandlers(io);
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

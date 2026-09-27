import { readFileSync } from 'node:fs';
import { createServer as createHttpServer } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createServer as createNetServer, type Socket } from 'node:net';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol.ts';
import { createApp } from './http/app.ts';
import { registerHandlers } from './sockets/registerHandlers.ts';

const port = Number(process.env.PORT || 3000);
// Root certs/ locally, /certs in Docker.
const certs = new URL('../../../certs/', import.meta.url);
const httpsServer = createHttpsServer(
  { key: readFileSync(new URL('key.pem', certs)), cert: readFileSync(new URL('cert.pem', certs)) },
  createApp(),
);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpsServer);

registerHandlers(io);

const redirectServer = createHttpServer((req, res) => {
  res.writeHead(308, { location: `https://${req.headers.host}${req.url}` }).end();
});

// One port for both protocols: TLS handshakes start with 0x16, anything else is redirected.
const route = (socket: Socket) => {
  const head: Buffer | null = socket.read(1);
  if (head === null) {
    socket.once('readable', () => route(socket));
    return;
  }
  socket.unshift(head);
  (head[0] === 0x16 ? httpsServer : redirectServer).emit('connection', socket);
};

createNetServer((socket) => {
  socket.on('error', () => socket.destroy());
  route(socket);
}).listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

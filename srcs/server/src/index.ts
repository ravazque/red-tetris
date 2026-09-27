import { createServer } from 'node:http';
import { Server } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../shared/protocol.ts';
import { createApp } from './http/app.ts';
import { registerHandlers } from './sockets/registerHandlers.ts';

const port = Number(process.env.PORT || 3000);
const httpServer = createServer(createApp());
const io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);

registerHandlers(io);

httpServer.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});

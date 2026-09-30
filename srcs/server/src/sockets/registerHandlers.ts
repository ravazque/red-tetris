import type { Server, Socket } from 'socket.io';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/protocol.ts';
import { createPlaceholderGame } from '../domain/Game.ts';
import { RoomManager } from '../rooms/RoomManager.ts';
import { RoomLifecycle } from '../rooms/RoomLifecycle.ts';
import { registerGameHandlers } from './gameHandlers.ts';
import { registerLobbyHandlers } from './lobbyHandlers.ts';

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export const registerHandlers = (io: IoServer) => {
  const rooms = new RoomManager();
  const lifecycle = new RoomLifecycle(rooms, createPlaceholderGame);

  io.on('connection', (socket) => {
    registerLobbyHandlers(io, socket, rooms, lifecycle);
    registerGameHandlers(io, socket);
  });
};

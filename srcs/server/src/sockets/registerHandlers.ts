import type { Server, Socket } from 'socket.io';
import { RECONNECT_GRACE_MS } from '../../../shared/constants.ts';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/protocol.ts';
import { createGame } from '../domain/Game.ts';
import { RoomManager } from '../rooms/RoomManager.ts';
import { RoomLifecycle } from '../rooms/RoomLifecycle.ts';
import { GRAVITY_MS, GameRunner } from './GameRunner.ts';
import { registerGameHandlers } from './gameHandlers.ts';
import { registerLobbyHandlers } from './lobbyHandlers.ts';
import { ReconnectGrace } from './ReconnectGrace.ts';

export type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;
export type IoSocket = Socket<ClientToServerEvents, ServerToClientEvents>;

export const registerHandlers = (io: IoServer, tickMs = GRAVITY_MS, graceMs = RECONNECT_GRACE_MS) => {
  const rooms = new RoomManager();
  const lifecycle = new RoomLifecycle(rooms, createGame);
  const runner = new GameRunner(io, rooms, lifecycle, tickMs);
  const grace = new ReconnectGrace(graceMs);

  io.on('connection', (socket) => {
    registerLobbyHandlers(io, socket, { rooms, lifecycle, runner, grace });
    registerGameHandlers(socket, rooms, runner);
  });
};

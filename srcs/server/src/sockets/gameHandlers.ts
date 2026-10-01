import type { PaddleDirection } from '../../../shared/game/pontrix.ts';
import type { GameInputPayload, PongInputPayload } from '../../../shared/types.ts';
import { GameError } from '../domain/Game.ts';
import type { RoomManager } from '../rooms/RoomManager.ts';
import type { GameRunner } from './GameRunner.ts';
import type { IoSocket } from './registerHandlers.ts';

// game:input: the socket's own seat in its own running room; the Game checks the action and the sequence.
export const registerGameHandlers = (socket: IoSocket, rooms: RoomManager, runner: GameRunner) => {
  socket.on('game:input', (payload) => {
    try {
      if (!isInput(payload)) throw new GameError('INVALID_PAYLOAD', 'roomId, action and sequence are required');
      const room = rooms.getRoomForSocket(socket.id);
      const member = room?.members.find(({ socketId }) => socketId === socket.id);
      if (!room || !member || room.roomId !== payload.roomId) throw new GameError('UNAUTHORIZED', 'Socket is not a member of this room');
      if (room.phase !== 'running') throw new GameError('INVALID_PHASE', 'No round is running');
      runner.input(room.roomId, member.playerId, payload.action, payload.sequence);
    } catch (error) {
      const gameError = error instanceof GameError ? error : new GameError('INTERNAL_ERROR', 'Unexpected game error');
      const roomId = isInput(payload) ? payload.roomId : null;
      socket.emit('room:error', { roomId, event: 'game:input', code: gameError.code, message: gameError.message });
    }
  });

  socket.on('pong:input', (payload) => {
    try {
      if (!isPongInput(payload)) throw new GameError('INVALID_PAYLOAD', 'roomId and direction are required');
      const room = rooms.getRoomForSocket(socket.id);
      const member = room?.members.find(({ socketId }) => socketId === socket.id);
      if (!room || !member || room.roomId !== payload.roomId) throw new GameError('UNAUTHORIZED', 'Socket is not a member of this room');
      if (room.mode !== 'pontrix') throw new GameError('INVALID_ACTION', 'Paddle input is only available in Pon-Trix');
      if (room.phase !== 'running') throw new GameError('INVALID_PHASE', 'No round is running');
      runner.paddleInput(room.roomId, member.playerId, payload.direction);
    } catch (error) {
      const gameError = error instanceof GameError ? error : new GameError('INTERNAL_ERROR', 'Unexpected Pong error');
      const roomId = isPongInput(payload) ? payload.roomId : null;
      socket.emit('room:error', { roomId, event: 'pong:input', code: gameError.code, message: gameError.message });
    }
  });
};

const isInput = (payload: unknown): payload is GameInputPayload =>
  typeof payload === 'object' && payload !== null
  && typeof (payload as GameInputPayload).roomId === 'string'
  && typeof (payload as GameInputPayload).action === 'string'
  && typeof (payload as GameInputPayload).sequence === 'number';

const isPongInput = (payload: unknown): payload is PongInputPayload =>
  typeof payload === 'object' && payload !== null
  && typeof (payload as PongInputPayload).roomId === 'string'
  && [-1, 0, 1].includes((payload as PongInputPayload).direction as number);

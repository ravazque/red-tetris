import { NAME_PATTERN, ROOM_MODES, ROOM_RULES, type RoomMode, type RoomRule } from '../../../shared/constants.ts';
import type { RoomJoinPayload } from '../../../shared/types.ts';
import { RoomManager, RoomManagerError, type LeaveResult, type RoomSnapshot } from '../rooms/RoomManager.ts';
import { RoomLifecycle } from '../rooms/RoomLifecycle.ts';
import type { GameRunner } from './GameRunner.ts';
import type { ReconnectGrace } from './ReconnectGrace.ts';
import { log } from './log.ts';
import type { IoServer, IoSocket } from './registerHandlers.ts';
import { emitRoomState as sendRoomState } from './roomState.ts';

export interface LobbyServices {
  readonly rooms: RoomManager;
  readonly lifecycle: RoomLifecycle;
  readonly runner: GameRunner;
  readonly grace: ReconnectGrace;
}

// The manager owns membership; this module translates it to Socket.IO room broadcasts and hands rounds to the GameRunner.
// Leave frees the seat at once; a dropped socket keeps it (and pauses the round) for the grace, and the same name takes it back.
// A duel that loses a player closes for good: a running round goes to the one left, then no joins, Start or Restart.
export const registerLobbyHandlers = (io: IoServer, socket: IoSocket, { rooms, lifecycle, runner, grace }: LobbyServices) => {
  log('connect', socket.id);

  const emitError = (event: 'room:join' | 'room:leave' | 'room:start' | 'room:restart', roomId: string | null, error: unknown) => {
    const managerError = error instanceof RoomManagerError ? error : new RoomManagerError('INTERNAL_ERROR', 'Unexpected lobby error');
    log('refused', event, roomId, managerError.code);
    socket.emit('room:error', { roomId, event, code: managerError.code, message: managerError.message });
  };

  const emitRoomState = (room: RoomSnapshot) => sendRoomState(io, room, lifecycle);

  const emitHostChanged = (room: RoomSnapshot) => {
    const host = room.members.find((member) => member.playerId === room.hostPlayerId);
    if (host) io.to(room.roomId).emit('host:changed', {
      roomId: room.roomId,
      revision: room.revision,
      playerId: host.playerId,
      playerName: host.name,
    });
  };

  // Empty room: gone. Otherwise the room closes; a running round ends there, won by the player left (its runner announces it).
  const settleLeave = (roomId: string, result: LeaveResult, reason: 'left' | 'timeout') => {
    if (!result.room) {
      runner.stop(roomId);
      lifecycle.remove(roomId);
      return;
    }
    lifecycle.clearReady(roomId);
    const wasRunning = result.room.phase === 'running';
    const room = rooms.close(roomId, { playerName: result.member.name, reason });
    log('closed', roomId, result.member.name, reason);
    if (wasRunning) runner.removePlayer(roomId, result.member.playerId, reason);
    else emitRoomState(room);
    runner.stop(roomId);
    if (result.hostChanged) emitHostChanged(rooms.getRoom(roomId) ?? room);
  };

  const leaveRoom = async () => {
    const previousRoom = rooms.getRoomForSocket(socket.id);
    const result = rooms.leave(socket.id);
    if (!result || !previousRoom) return;
    log('leave', previousRoom.roomId, result.member.name);
    settleLeave(previousRoom.roomId, result, 'left');
    await socket.leave(previousRoom.roomId);
  };

  const dropHeldSeat = (roomId: string, playerId: string) => {
    const result = rooms.removeHeld(roomId, playerId);
    if (!result) return;
    log('seat dropped', roomId, result.member.name, 'no reconnection in time');
    settleLeave(roomId, result, 'timeout');
  };

  socket.on('room:join', async (payload) => {
    try {
      const join = validateJoinPayload(payload);
      const existingRoom = rooms.getRoom(join.roomId);
      if (!existingRoom && join.mode === undefined) {
        throw new RoomManagerError('ROOM_NOT_FOUND', 'Room does not exist');
      }

      const mode = join.mode ?? existingRoom?.mode ?? 'versus';
      const result = rooms.join(join.roomId, join.playerName, socket.id, mode, ruleFor(mode, join.rule));
      const { roomId } = result.room;
      log(result.reclaimed ? 'rejoin' : 'join', roomId, join.playerName, result.room.mode, result.room.rule);
      await socket.join(roomId);
      if (!result.reclaimed) {
        lifecycle.clearReady(roomId);
        emitRoomState(rooms.getRoom(roomId) ?? result.room);
        return;
      }
      grace.cancel(roomId, result.member.playerId);
      emitRoomState(rooms.getRoom(roomId) ?? result.room);
      runner.resume(roomId);
      runner.catchUp(roomId, socket.id);
    } catch (error) {
      emitError('room:join', readRoomId(payload), error);
    }
  });

  socket.on('room:leave', async (payload) => {
    const roomId = readRoomId(payload);
    try {
      if (!isRoomCommand(payload)) throw new RoomManagerError('INVALID_PAYLOAD', 'roomId is required');
      const currentRoom = rooms.getRoomForSocket(socket.id);
      if (!currentRoom || currentRoom.roomId !== payload.roomId) {
        throw new RoomManagerError('UNAUTHORIZED', 'Socket is not a member of this room');
      }
      await leaveRoom();
    } catch (error) {
      emitError('room:leave', roomId, error);
    }
  });

  const startRoom = (event: 'room:start' | 'room:restart', payload: { roomId: string }) => {
    try {
      const result = event === 'room:start'
        ? lifecycle.start(payload.roomId, socket.id)
        : lifecycle.restart(payload.roomId, socket.id);
      emitRoomState(result.room);
      if (!result.game) return;
      log('round', result.room.roomId, result.room.members.map(({ name }) => name).join(' vs '));
      io.to(result.room.roomId).emit('game:started', {
        roomId: result.room.roomId,
        revision: result.room.revision,
        phase: 'running',
        playerIds: result.room.members.map(({ playerId }) => playerId),
      });
      runner.start(result.room.roomId);
    } catch (error) {
      emitError(event, isRoomCommand(payload) ? payload.roomId : null, error);
    }
  };

  socket.on('room:start', (payload) => {
    if (!isRoomCommand(payload)) {
      emitError('room:start', null, new RoomManagerError('INVALID_PAYLOAD', 'roomId is required'));
      return;
    }
    startRoom('room:start', payload);
  });

  socket.on('room:restart', (payload) => {
    if (!isRoomCommand(payload)) {
      emitError('room:restart', null, new RoomManagerError('INVALID_PAYLOAD', 'roomId is required'));
      return;
    }
    startRoom('room:restart', payload);
  });

  socket.on('disconnect', (reason) => {
    const held = rooms.disconnect(socket.id);
    log('disconnect', socket.id, reason, held ? `${held.room.roomId} ${held.member.name}: seat held ${grace.ms} ms` : '');
    if (!held) return;
    const { room, member } = held;
    lifecycle.unready(room.roomId, member.playerId);
    emitRoomState(room);
    runner.pause(room.roomId, member.playerId, grace.ms);
    grace.hold(room.roomId, member.playerId, () => dropHeldSeat(room.roomId, member.playerId));
  });
};

const validateJoinPayload = (payload: RoomJoinPayload): RoomJoinPayload => {
  if (!payload || typeof payload !== 'object' || typeof payload.roomId !== 'string' || typeof payload.playerName !== 'string') {
    throw new RoomManagerError('INVALID_PAYLOAD', 'roomId and playerName are required');
  }
  if (!NAME_PATTERN.test(payload.roomId)) throw new RoomManagerError('INVALID_ROOM', 'room name has an invalid format');
  if (!NAME_PATTERN.test(payload.playerName)) throw new RoomManagerError('INVALID_PLAYER', 'player name has an invalid format');
  if (payload.mode !== undefined && !(ROOM_MODES as readonly string[]).includes(payload.mode)) {
    throw new RoomManagerError('INVALID_PAYLOAD', 'mode is invalid');
  }
  if (payload.rule !== undefined && !(ROOM_RULES as readonly string[]).includes(payload.rule)) {
    throw new RoomManagerError('INVALID_PAYLOAD', 'rule is invalid');
  }
  return payload;
};

// Versus lets its creator choose (last standing by default); Pon-Trix always plays score; solo has no rival.
const ruleFor = (mode: RoomMode, requested: RoomRule | undefined): RoomRule =>
  mode === 'pontrix' ? 'score' : mode === 'versus' ? (requested ?? 'survival') : 'survival';

const isRoomCommand = (payload: unknown): payload is { roomId: string } =>
  Boolean(payload) && typeof payload === 'object' && typeof (payload as { roomId?: unknown }).roomId === 'string';

const readRoomId = (payload: unknown): string | null => isRoomCommand(payload) ? payload.roomId : null;

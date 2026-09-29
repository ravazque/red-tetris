import { NAME_PATTERN, ROOM_MODES } from '../../../shared/constants.ts';
import type { RoomJoinPayload, RoomStatePayload } from '../../../shared/types.ts';
import { RoomManager, RoomManagerError, type RoomSnapshot } from '../rooms/RoomManager.ts';
import type { IoServer, IoSocket } from './registerHandlers.ts';

// Lobby commands are deliberately kept independent from Game. The manager owns
// membership; this module only translates it to Socket.IO room broadcasts.
export const registerLobbyHandlers = (io: IoServer, socket: IoSocket, rooms: RoomManager) => {
  const emitError = (event: 'room:join' | 'room:leave', roomId: string | null, error: unknown) => {
    const managerError = error instanceof RoomManagerError ? error : new RoomManagerError('INTERNAL_ERROR', 'Unexpected lobby error');
    socket.emit('room:error', { roomId, event, code: managerError.code, message: managerError.message });
  };

  const emitRoomState = (room: RoomSnapshot) => {
    const players = room.members.map((member) => ({ playerId: member.playerId, name: member.name, isAlive: true }));
    for (const member of room.members) {
      const memberSocket = io.sockets.sockets.get(member.socketId);
      if (!memberSocket) continue;
      const payload: RoomStatePayload = {
        roomId: room.roomId,
        revision: room.revision,
        phase: room.phase,
        mode: room.mode,
        selfPlayerId: member.playerId,
        hostPlayerId: room.hostPlayerId,
        players,
      };
      memberSocket.emit('room:state', payload);
    }
  };

  const emitHostChanged = (room: RoomSnapshot) => {
    const host = room.members.find((member) => member.playerId === room.hostPlayerId);
    if (host) io.to(room.roomId).emit('host:changed', {
      roomId: room.roomId,
      revision: room.revision,
      playerId: host.playerId,
      playerName: host.name,
    });
  };

  const removeSocket = async () => {
    const previousRoom = rooms.getRoomForSocket(socket.id);
    const result = rooms.leave(socket.id);
    if (!result) return;

    if (previousRoom) await socket.leave(previousRoom.roomId);
    if (result.room) {
      emitRoomState(result.room);
      if (result.hostChanged) emitHostChanged(result.room);
    }
  };

  socket.on('room:join', async (payload) => {
    try {
      const join = validateJoinPayload(payload);
      const existingRoom = rooms.getRoom(join.roomId);
      if (!existingRoom && join.mode === undefined) {
        throw new RoomManagerError('ROOM_NOT_FOUND', 'Room does not exist');
      }

      const result = rooms.join(join.roomId, join.playerName, socket.id, join.mode ?? existingRoom?.mode ?? 'versus');
      await socket.join(result.room.roomId);
      emitRoomState(result.room);
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
      await removeSocket();
    } catch (error) {
      emitError('room:leave', roomId, error);
    }
  });

  socket.on('disconnect', () => {
    void removeSocket();
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
  return payload;
};

const isRoomCommand = (payload: unknown): payload is { roomId: string } =>
  Boolean(payload) && typeof payload === 'object' && typeof (payload as { roomId?: unknown }).roomId === 'string';

const readRoomId = (payload: unknown): string | null => isRoomCommand(payload) ? payload.roomId : null;

import type { RoomStatePayload } from '../../../shared/types.ts';
import type { RoomLifecycle } from '../rooms/RoomLifecycle.ts';
import type { RoomSnapshot } from '../rooms/RoomManager.ts';
import type { IoServer } from './registerHandlers.ts';

// room:state to each member with its own selfPlayerId; isAlive comes from the room's Game when the player is in it.
export const emitRoomState = (io: IoServer, room: RoomSnapshot, lifecycle: RoomLifecycle) => {
  const game = lifecycle.getGame(room.roomId);
  const players = room.members.map(({ playerId, name, connected }) => ({
    playerId,
    name,
    isAlive: game?.playerIds.includes(playerId) ? game.snapshot(playerId).isAlive : true,
    isReady: lifecycle.isReady(room.roomId, playerId),
    isConnected: connected,
  }));
  for (const member of room.members) {
    const payload: RoomStatePayload = {
      roomId: room.roomId,
      revision: room.revision,
      phase: room.phase,
      mode: room.mode,
      rule: room.rule,
      selfPlayerId: member.playerId,
      hostPlayerId: room.hostPlayerId,
      players,
      closed: room.closed,
    };
    io.sockets.sockets.get(member.socketId)?.emit('room:state', payload);
  }
};

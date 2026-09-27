import type { IoServer, IoSocket } from './registerHandlers.ts';

// room:join, room:leave, room:start, room:restart and disconnect.
// Validates against socket.id, delegates to RoomManager, emits room:state / host:changed / room:error.
export const registerLobbyHandlers = (_io: IoServer, _socket: IoSocket) => {};

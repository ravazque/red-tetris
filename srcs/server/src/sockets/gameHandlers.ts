import type { IoServer, IoSocket } from './registerHandlers.ts';

// game:input → validated and applied through the room's Game.
// Broadcasts game:state, game:spectrum, game:penalty, game:player_eliminated, game:finished.
export const registerGameHandlers = (_io: IoServer, _socket: IoSocket) => {};

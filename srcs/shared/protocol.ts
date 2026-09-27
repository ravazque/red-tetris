// Socket.IO event contracts shared by client and server: event names and payload types only.
// Client → server: room:join, room:leave, room:start, room:restart, game:input.
// Server → client: room:state, room:error, host:changed, game:started, game:state,
//                  game:spectrum, game:penalty, game:player_eliminated, game:finished.
// Payloads carry roomId, playerId and revision where relevant.

export interface ClientToServerEvents {}

export interface ServerToClientEvents {}

export const SOCKET_EVENTS = {
  roomJoin: 'room:join',
  roomLeave: 'room:leave',
  roomStart: 'room:start',
  roomRestart: 'room:restart',
  gameInput: 'game:input',
  roomState: 'room:state',
  roomError: 'room:error',
  hostChanged: 'host:changed',
  gameStarted: 'game:started',
  gameState: 'game:state',
  gameSpectrum: 'game:spectrum',
  gamePenalty: 'game:penalty',
  gamePlayerEliminated: 'game:player_eliminated',
  gameFinished: 'game:finished',
  gamePaused: 'game:paused',
  gameResumed: 'game:resumed',
  pongState: 'pong:state',
} as const;

export const ROOM_PHASES = ['waiting', 'running', 'finished'] as const;
export const ROOM_MODES = ['solo', 'versus', 'pontrix'] as const;
// How a duel ends: survival, the last player standing wins; score, a topped-out player waits and the higher score wins once both are out.
export const ROOM_RULES = ['survival', 'score'] as const;

export const GAME_ACTIONS = [
  'move_left',
  'move_right',
  'rotate',
  'soft_drop',
  'hard_drop',
] as const;

export const ERROR_CODES = {
  invalidPayload: 'INVALID_PAYLOAD',
  invalidRoom: 'INVALID_ROOM',
  invalidPlayer: 'INVALID_PLAYER',
  unauthorized: 'UNAUTHORIZED',
  invalidPhase: 'INVALID_PHASE',
  roomFull: 'ROOM_FULL',
  roomRunning: 'ROOM_RUNNING',
  roomNotFound: 'ROOM_NOT_FOUND',
  roomClosed: 'ROOM_CLOSED',
  notEnoughPlayers: 'NOT_ENOUGH_PLAYERS',
  notReady: 'NOT_READY',
  invalidAction: 'INVALID_ACTION',
  internalError: 'INTERNAL_ERROR',
} as const;

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;
export const MAX_PLAYERS_PER_ROOM = 2;
export const NAME_PATTERN = /^[A-Za-z0-9_-]{3,12}$/;
// A dropped socket keeps its seat (and pauses a running round) this long; the same name rejoining takes it back.
export const RECONNECT_GRACE_MS = 15_000;

export type RoomPhase = (typeof ROOM_PHASES)[number];
export type RoomMode = (typeof ROOM_MODES)[number];
export type RoomRule = (typeof ROOM_RULES)[number];
export type GameAction = (typeof GAME_ACTIONS)[number];
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
export type SocketEventName = (typeof SOCKET_EVENTS)[keyof typeof SOCKET_EVENTS];

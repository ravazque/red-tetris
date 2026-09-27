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
} as const;

export const ROOM_PHASES = ['waiting', 'running', 'finished'] as const;

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
  staleRevision: 'STALE_REVISION',
  invalidAction: 'INVALID_ACTION',
  internalError: 'INTERNAL_ERROR',
} as const;

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export type RoomPhase = (typeof ROOM_PHASES)[number];
export type GameAction = (typeof GAME_ACTIONS)[number];
export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

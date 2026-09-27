import { SOCKET_EVENTS } from './constants.ts';
import type {
  GameFinishedPayload,
  GameInputPayload,
  GamePenaltyPayload,
  GamePlayerEliminatedPayload,
  GameSpectrumPayload,
  GameStartedPayload,
  GameStatePayload,
  HostChangedPayload,
  RoomCommandPayload,
  RoomErrorPayload,
  RoomJoinPayload,
  RoomStatePayload,
} from './types.ts';

// Commands do not use acknowledgements in the first protocol version. A
// command succeeds through the corresponding state event; failures use
// room:error so all command errors have one shape.
export interface ClientToServerEvents {
  [SOCKET_EVENTS.roomJoin]: (payload: RoomJoinPayload) => void;
  [SOCKET_EVENTS.roomLeave]: (payload: RoomCommandPayload) => void;
  [SOCKET_EVENTS.roomStart]: (payload: RoomCommandPayload) => void;
  [SOCKET_EVENTS.roomRestart]: (payload: RoomCommandPayload) => void;
  [SOCKET_EVENTS.gameInput]: (payload: GameInputPayload) => void;
}

export interface ServerToClientEvents {
  [SOCKET_EVENTS.roomState]: (payload: RoomStatePayload) => void;
  [SOCKET_EVENTS.roomError]: (payload: RoomErrorPayload) => void;
  [SOCKET_EVENTS.hostChanged]: (payload: HostChangedPayload) => void;
  [SOCKET_EVENTS.gameStarted]: (payload: GameStartedPayload) => void;
  [SOCKET_EVENTS.gameState]: (payload: GameStatePayload) => void;
  [SOCKET_EVENTS.gameSpectrum]: (payload: GameSpectrumPayload) => void;
  [SOCKET_EVENTS.gamePenalty]: (payload: GamePenaltyPayload) => void;
  [SOCKET_EVENTS.gamePlayerEliminated]: (payload: GamePlayerEliminatedPayload) => void;
  [SOCKET_EVENTS.gameFinished]: (payload: GameFinishedPayload) => void;
}

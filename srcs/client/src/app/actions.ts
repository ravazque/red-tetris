import { createAction } from '@reduxjs/toolkit';
import type {
  GameFinishedPayload,
  GameInputPayload,
  GamePausedPayload,
  GameSpectrumPayload,
  GameStartedPayload,
  GameStatePayload,
  HostChangedPayload,
  PongStatePayload,
  PongInputPayload,
  RevisionEnvelope,
  RoomCommandPayload,
  RoomErrorPayload,
  RoomJoinPayload,
  RoomStatePayload,
} from '../../../shared/types.ts';

// Local payload extension until shared/ has it: why the round ended (score: every duel player topped out, the higher score won).
export type FinishReason = 'topout' | 'score' | 'left' | 'timeout';

export interface GameFinishedReceivedPayload extends GameFinishedPayload {
  readonly reason?: FinishReason;
}

// Boundary with socketMiddleware.ts: *Requested → socket command, the rest ← server event.
export const joinRequested = createAction<RoomJoinPayload>('room/joinRequested');
export const leaveRequested = createAction<RoomCommandPayload>('room/leaveRequested');
export const startRequested = createAction<RoomCommandPayload>('room/startRequested');
export const restartRequested = createAction<RoomCommandPayload>('room/restartRequested');
export const inputRequested = createAction<GameInputPayload>('game/inputRequested');
export const paddleInputRequested = createAction<PongInputPayload>('pong/inputRequested');
export const roomStateReceived = createAction<RoomStatePayload>('room/stateReceived');
export const roomErrorReceived = createAction<RoomErrorPayload>('room/errorReceived');
export const hostChanged = createAction<HostChangedPayload>('room/hostChanged');
export const gameStarted = createAction<GameStartedPayload>('game/started');
export const gameFinished = createAction<GameFinishedReceivedPayload>('game/finished');
export const gamePaused = createAction<GamePausedPayload>('game/paused');
export const gameResumed = createAction<RevisionEnvelope>('game/resumed');
export const connectionChanged = createAction<boolean>('app/connectionChanged');
export const gameStateReceived = createAction<GameStatePayload>('game/stateReceived');
export const spectrumReceived = createAction<GameSpectrumPayload>('game/spectrumReceived');
export const pongStateReceived = createAction<PongStatePayload>('pong/stateReceived');

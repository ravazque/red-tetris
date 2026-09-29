import { createAction } from '@reduxjs/toolkit';
import type {
  GameFinishedPayload,
  GameSpectrumPayload,
  GameStartedPayload,
  GameStatePayload,
  HostChangedPayload,
  PongStatePayload,
  RevisionEnvelope,
  RoomCommandPayload,
  RoomErrorPayload,
  RoomJoinPayload,
  RoomStatePayload,
} from '../../../shared/types.ts';

// Local payload extensions until shared/ has them. Reconnection grace (#26): the game freezes while a disconnected player may come back; reason explains the end.
export type FinishReason = 'topout' | 'left' | 'timeout';

export interface GameFinishedReceivedPayload extends GameFinishedPayload {
  readonly reason?: FinishReason;
}

export interface GamePausedPayload extends RevisionEnvelope {
  readonly playerId: string;
  readonly graceMs: number;
}

// Boundary with socketMiddleware.ts: *Requested → socket command, the rest ← server event.
export const joinRequested = createAction<RoomJoinPayload>('room/joinRequested');
export const leaveRequested = createAction<RoomCommandPayload>('room/leaveRequested');
export const startRequested = createAction<RoomCommandPayload>('room/startRequested');
export const restartRequested = createAction<RoomCommandPayload>('room/restartRequested');
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

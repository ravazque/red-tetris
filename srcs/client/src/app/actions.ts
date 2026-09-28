import { createAction } from '@reduxjs/toolkit';
import type { GameSnapshot } from '../../../shared/game/types.ts';
import type { PongState } from '../../../shared/game/pontrix.ts';
import type {
  GameFinishedPayload,
  GameSpectrumPayload,
  GameStartedPayload,
  GameStatePayload,
  HostChangedPayload,
  RevisionEnvelope,
  RoomCommandPayload,
  RoomErrorPayload,
  RoomJoinPayload,
  RoomStatePayload,
} from '../../../shared/types.ts';
import type { RoomMode } from '../room/modes.ts';

// Local payload extensions until shared/types.ts has them (#4: mode, typed game state; #24: pong:state).
export interface JoinRequestPayload extends RoomJoinPayload {
  readonly mode: RoomMode;
}

export interface RoomStateReceivedPayload extends RoomStatePayload {
  readonly mode?: RoomMode;
}

export interface GameStateReceivedPayload extends Omit<GameStatePayload, 'state'> {
  readonly state: GameSnapshot;
}

export interface PongStatePayload extends RevisionEnvelope {
  readonly state: PongState;
}

// Boundary with socketMiddleware.ts: *Requested → socket command, the rest ← server event.
export const joinRequested = createAction<JoinRequestPayload>('room/joinRequested');
export const leaveRequested = createAction<RoomCommandPayload>('room/leaveRequested');
export const startRequested = createAction<RoomCommandPayload>('room/startRequested');
export const restartRequested = createAction<RoomCommandPayload>('room/restartRequested');
export const roomStateReceived = createAction<RoomStateReceivedPayload>('room/stateReceived');
export const roomErrorReceived = createAction<RoomErrorPayload>('room/errorReceived');
export const hostChanged = createAction<HostChangedPayload>('room/hostChanged');
export const gameStarted = createAction<GameStartedPayload>('game/started');
export const gameFinished = createAction<GameFinishedPayload>('game/finished');
export const gameStateReceived = createAction<GameStateReceivedPayload>('game/stateReceived');
export const spectrumReceived = createAction<GameSpectrumPayload>('game/spectrumReceived');
export const pongStateReceived = createAction<PongStatePayload>('pong/stateReceived');

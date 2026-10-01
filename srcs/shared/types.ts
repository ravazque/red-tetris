import type { ErrorCode, GameAction, RoomMode, RoomPhase, RoomRule, SocketEventName } from './constants.ts';
import type { GameSnapshot } from './game/types.ts';
import type { PongState } from './game/pontrix.ts';

export interface RoomCommandPayload {
  readonly roomId: string;
}

export interface RoomJoinPayload {
  readonly roomId: string;
  readonly playerName: string;
  readonly mode?: RoomMode;
  // Versus only, when creating the room (survival if missing); Pon-Trix always plays score.
  readonly rule?: RoomRule;
}

export interface GameInputPayload extends RoomCommandPayload {
  readonly action: GameAction;
  readonly sequence: number;
}

export interface RevisionEnvelope {
  readonly roomId: string;
  readonly revision: number;
}

export interface RoomPlayerSummary {
  readonly playerId: string;
  readonly name: string;
  readonly isAlive: boolean;
  // Pressed Start (waiting) or Restart (finished); the round begins once every seat is ready.
  readonly isReady: boolean;
  // false while the seat is held for a reconnection (RECONNECT_GRACE_MS).
  readonly isConnected: boolean;
}

// Why a duel room closed for good: its other player pressed Leave or did not reconnect within RECONNECT_GRACE_MS.
export interface RoomClosure {
  readonly playerName: string;
  readonly reason: 'left' | 'timeout';
}

export interface RoomStatePayload extends RevisionEnvelope {
  readonly phase: RoomPhase;
  readonly mode: RoomMode;
  readonly rule: RoomRule;
  readonly selfPlayerId: string;
  readonly hostPlayerId: string;
  readonly players: readonly RoomPlayerSummary[];
  // Set once the room is over: no joins, no Start or Restart; the last player leaving deletes it.
  readonly closed: RoomClosure | null;
}

export interface RoomErrorPayload {
  readonly roomId: string | null;
  readonly event: SocketEventName;
  readonly code: ErrorCode;
  readonly message: string;
}

export interface HostChangedPayload extends RevisionEnvelope {
  readonly playerId: string;
  readonly playerName: string;
}

export interface GameStartedPayload extends RevisionEnvelope {
  readonly phase: 'running';
  readonly playerIds: readonly string[];
}

// The exact game snapshot belongs to Raul's Game implementation and will be
// narrowed in the adapter issue. The protocol still gives it a stable envelope.
export interface GameStatePayload extends RevisionEnvelope {
  readonly playerId: string;
  readonly state: GameSnapshot;
}

export interface PongStatePayload extends RevisionEnvelope {
  readonly state: PongState;
}

export interface GameSpectrumPayload extends RevisionEnvelope {
  readonly playerId: string;
  readonly spectrum: readonly number[];
}

export interface GamePenaltyPayload extends RevisionEnvelope {
  readonly sourcePlayerId: string;
  readonly targetPlayerId: string;
  readonly lines: number;
}

export interface GamePlayerEliminatedPayload extends RevisionEnvelope {
  readonly playerId: string;
}

export interface GamePausedPayload extends RevisionEnvelope {
  readonly playerId: string;
  readonly graceMs: number;
}

export interface GameFinishedPayload extends RevisionEnvelope {
  readonly winnerPlayerId: string | null;
}

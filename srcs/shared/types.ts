import type { ErrorCode, GameAction, RoomMode, RoomPhase, SocketEventName } from './constants.ts';
import type { GameSnapshot } from './game/types.ts';
import type { PongState } from './game/pontrix.ts';

export interface RoomCommandPayload {
  readonly roomId: string;
}

export interface RoomJoinPayload {
  readonly roomId: string;
  readonly playerName: string;
  readonly mode?: RoomMode;
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
}

export interface RoomStatePayload extends RevisionEnvelope {
  readonly phase: RoomPhase;
  readonly mode: RoomMode;
  readonly selfPlayerId: string;
  readonly hostPlayerId: string;
  readonly players: readonly RoomPlayerSummary[];
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

export interface GameFinishedPayload extends RevisionEnvelope {
  readonly winnerPlayerId: string | null;
}

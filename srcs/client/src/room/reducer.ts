import { createSlice } from '@reduxjs/toolkit';
import type { RoomMode, RoomPhase, RoomRule } from '../../../shared/constants.ts';
import type { RevisionEnvelope, RoomClosure, RoomErrorPayload, RoomPlayerSummary } from '../../../shared/types.ts';
import {
  gameFinished,
  gamePaused,
  gameResumed,
  gameStarted,
  hostChanged,
  joinRequested,
  leaveRequested,
  roomErrorReceived,
  roomStateReceived,
  type FinishReason,
} from '../app/actions.ts';

export interface RoomPause {
  readonly playerId: string;
  readonly graceMs: number;
  readonly revision: number;
}

export interface RoomState {
  readonly roomId: string | null;
  readonly phase: RoomPhase | null;
  readonly mode: RoomMode | null;
  readonly rule: RoomRule | null;
  readonly selfPlayerId: string | null;
  readonly hostPlayerId: string | null;
  readonly players: readonly RoomPlayerSummary[];
  readonly winnerPlayerId: string | null;
  readonly finishReason: FinishReason | null;
  readonly pause: RoomPause | null;
  readonly revision: number;
  readonly error: RoomErrorPayload | null;
  readonly closed: RoomClosure | null;
}

const initialState: RoomState = {
  roomId: null,
  phase: null,
  mode: null,
  rule: null,
  selfPlayerId: null,
  hostPlayerId: null,
  players: [],
  winnerPlayerId: null,
  finishReason: null,
  pause: null,
  revision: -1,
  error: null,
  closed: null,
};

// Mirror of the server room: payloads for another room or with an older revision are dropped.
const isCurrent = (state: RoomState, payload: RevisionEnvelope) =>
  payload.roomId === state.roomId && payload.revision >= state.revision;

export const isSelfHost = (state: RoomState) => state.selfPlayerId !== null && state.selfPlayerId === state.hostPlayerId;

// You and the other player as the server last described them; readiness comes with each room:state.
export const selectPlayers = (state: RoomState) => ({
  self: state.players.find(({ playerId }) => playerId === state.selfPlayerId) ?? null,
  rival: state.players.find(({ playerId }) => playerId !== state.selfPlayerId) ?? null,
});

// A room that has played once never shows the invite again, even if a seat frees up.
export const hasStarted = (state: RoomState) => state.phase === 'running' || state.phase === 'finished';

export interface Seat {
  readonly playerId: string | null;
  readonly name: string;
  readonly self: boolean;
}

// Players in join order; before the first room:state, only the local player named in the URL.
export const selectSeats = (state: RoomState, selfName: string): readonly Seat[] =>
  state.players.length === 0
    ? [{ playerId: null, name: selfName, self: true }]
    : state.players.map(({ playerId, name }) => ({
        playerId,
        name,
        self: playerId === state.selfPlayerId,
      }));

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(joinRequested, (_state, { payload }) => ({ ...initialState, roomId: payload.roomId, mode: payload.mode ?? null, rule: payload.rule ?? null }))
      .addCase(leaveRequested, () => initialState)
      .addCase(roomStateReceived, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.phase = payload.phase;
        if (payload.phase !== 'running') state.pause = null;
        state.mode = payload.mode;
        state.rule = payload.rule;
        state.selfPlayerId = payload.selfPlayerId;
        state.hostPlayerId = payload.hostPlayerId;
        state.players = [...payload.players];
        state.closed = payload.closed;
        state.revision = payload.revision;
        state.error = null;
      })
      .addCase(gameStarted, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.phase = payload.phase;
        state.winnerPlayerId = null;
        state.finishReason = null;
        state.pause = null;
        state.revision = payload.revision;
        state.error = null;
      })
      .addCase(gameFinished, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.phase = 'finished';
        state.winnerPlayerId = payload.winnerPlayerId;
        state.finishReason = payload.reason ?? null;
        state.pause = null;
        state.revision = payload.revision;
      })
      .addCase(gamePaused, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.pause = { playerId: payload.playerId, graceMs: payload.graceMs, revision: payload.revision };
        state.revision = payload.revision;
      })
      .addCase(gameResumed, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.pause = null;
        state.revision = payload.revision;
      })
      .addCase(hostChanged, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.hostPlayerId = payload.playerId;
        state.revision = payload.revision;
      })
      .addCase(roomErrorReceived, (state, { payload }) => {
        if (payload.roomId !== null && payload.roomId !== state.roomId) return;
        state.error = payload;
      });
  },
});

export const roomReducer = roomSlice.reducer;

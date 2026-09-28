import { createSlice } from '@reduxjs/toolkit';
import type { RoomPhase } from '../../../shared/constants.ts';
import type { RevisionEnvelope, RoomErrorPayload, RoomPlayerSummary } from '../../../shared/types.ts';
import {
  gameFinished,
  gameStarted,
  hostChanged,
  joinRequested,
  leaveRequested,
  roomErrorReceived,
  roomStateReceived,
} from '../app/actions.ts';
import type { RoomMode } from './modes.ts';

export interface RoomState {
  readonly roomId: string | null;
  readonly mode: RoomMode | null;
  readonly phase: RoomPhase | null;
  readonly selfPlayerId: string | null;
  readonly hostPlayerId: string | null;
  readonly players: readonly RoomPlayerSummary[];
  readonly winnerPlayerId: string | null;
  readonly revision: number;
  readonly error: RoomErrorPayload | null;
}

const initialState: RoomState = {
  roomId: null,
  mode: null,
  phase: null,
  selfPlayerId: null,
  hostPlayerId: null,
  players: [],
  winnerPlayerId: null,
  revision: -1,
  error: null,
};

// Mirror of the server room: payloads for another room or with an older revision are dropped.
const isCurrent = (state: RoomState, payload: RevisionEnvelope) =>
  payload.roomId === state.roomId && payload.revision >= state.revision;

export const isSelfHost = (state: RoomState) => state.selfPlayerId !== null && state.selfPlayerId === state.hostPlayerId;

export interface Seat {
  readonly playerId: string | null;
  readonly name: string;
  readonly self: boolean;
  readonly host: boolean;
}

// Players in join order; before the first room:state, only the local player named in the URL.
export const selectSeats = (state: RoomState, selfName: string): readonly Seat[] =>
  state.players.length === 0
    ? [{ playerId: null, name: selfName, self: true, host: false }]
    : state.players.map(({ playerId, name }) => ({
        playerId,
        name,
        self: playerId === state.selfPlayerId,
        host: playerId === state.hostPlayerId,
      }));

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(joinRequested, (_state, { payload }) => ({ ...initialState, roomId: payload.roomId, mode: payload.mode }))
      .addCase(leaveRequested, () => initialState)
      .addCase(roomStateReceived, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.mode = payload.mode ?? state.mode;
        state.phase = payload.phase;
        state.selfPlayerId = payload.selfPlayerId;
        state.hostPlayerId = payload.hostPlayerId;
        state.players = [...payload.players];
        state.revision = payload.revision;
        state.error = null;
      })
      .addCase(gameStarted, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.phase = payload.phase;
        state.winnerPlayerId = null;
        state.revision = payload.revision;
        state.error = null;
      })
      .addCase(gameFinished, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.phase = 'finished';
        state.winnerPlayerId = payload.winnerPlayerId;
        state.revision = payload.revision;
      })
      .addCase(hostChanged, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.hostPlayerId = payload.playerId;
        state.revision = payload.revision;
      })
      .addCase(roomErrorReceived, (state, { payload }) => {
        state.error = payload;
      });
  },
});

export const roomReducer = roomSlice.reducer;

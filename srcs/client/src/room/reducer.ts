import { createSlice } from '@reduxjs/toolkit';
import type { RoomPhase } from '../../../shared/constants.ts';
import type { RevisionEnvelope, RoomErrorPayload, RoomPlayerSummary } from '../../../shared/types.ts';
import { hostChanged, joinRequested, leaveRequested, roomErrorReceived, roomStateReceived } from '../app/actions.ts';

export interface RoomState {
  readonly roomId: string | null;
  readonly phase: RoomPhase | null;
  readonly selfPlayerId: string | null;
  readonly hostPlayerId: string | null;
  readonly players: readonly RoomPlayerSummary[];
  readonly revision: number;
  readonly error: RoomErrorPayload | null;
}

const initialState: RoomState = {
  roomId: null,
  phase: null,
  selfPlayerId: null,
  hostPlayerId: null,
  players: [],
  revision: -1,
  error: null,
};

// Mirror of the server room: payloads for another room or with an older revision are dropped.
const isCurrent = (state: RoomState, payload: RevisionEnvelope) =>
  payload.roomId === state.roomId && payload.revision >= state.revision;

const roomSlice = createSlice({
  name: 'room',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(joinRequested, (_state, { payload }) => ({ ...initialState, roomId: payload.roomId }))
      .addCase(leaveRequested, () => initialState)
      .addCase(roomStateReceived, (state, { payload }) => {
        if (!isCurrent(state, payload)) return;
        state.phase = payload.phase;
        state.selfPlayerId = payload.selfPlayerId;
        state.hostPlayerId = payload.hostPlayerId;
        state.players = [...payload.players];
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

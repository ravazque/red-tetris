import { createSlice } from '@reduxjs/toolkit';
import { PONTRIX_ARENA_HEIGHT, PONTRIX_ARENA_WIDTH, type PongState } from '../../../shared/game/pontrix.ts';
import { gameStarted, joinRequested, leaveRequested, pongStateReceived } from '../app/actions.ts';

export interface PongSliceState {
  readonly revision: number;
  readonly state: PongState | null;
}

const initialState: PongSliceState = { revision: -1, state: null };

export const PONG_CENTER = { x: PONTRIX_ARENA_WIDTH / 2, y: PONTRIX_ARENA_HEIGHT / 2 } as const;

// Pon-Trix ball and paddles from pong:state (#24); until then everything rests at the centre.
const pongSlice = createSlice({
  name: 'pong',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(joinRequested, () => initialState)
      .addCase(leaveRequested, () => initialState)
      .addCase(gameStarted, (_state, { payload }) => ({ ...initialState, revision: payload.revision }))
      .addCase(pongStateReceived, (state, { payload }) => {
        if (payload.revision < state.revision) return;
        state.state = payload.state;
        state.revision = payload.revision;
      });
  },
});

export const pongReducer = pongSlice.reducer;

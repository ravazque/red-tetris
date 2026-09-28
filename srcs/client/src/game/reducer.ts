import { createSlice, type Draft } from '@reduxjs/toolkit';
import { createBoard, mergePiece } from '../../../shared/game/board.ts';
import type { Board, GameSnapshot } from '../../../shared/game/types.ts';
import { gameStarted, gameStateReceived, joinRequested, leaveRequested, spectrumReceived } from '../app/actions.ts';

export interface GameSliceState {
  readonly revision: number;
  readonly players: Readonly<Record<string, GameSnapshot>>;
  readonly spectrums: Readonly<Record<string, readonly number[]>>;
}

const initialState: GameSliceState = { revision: -1, players: {}, spectrums: {} };

const EMPTY_BOARD = createBoard();

// Board as drawn: settled cells plus the active piece; empty until the server sends a snapshot.
export const boardOf = (snapshot: GameSnapshot | undefined): Board =>
  snapshot === undefined ? EMPTY_BOARD : snapshot.active ? mergePiece(snapshot.board, snapshot.active) : snapshot.board;

const gameSlice = createSlice({
  name: 'game',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(joinRequested, () => initialState)
      .addCase(leaveRequested, () => initialState)
      .addCase(gameStarted, (_state, { payload }) => ({ ...initialState, revision: payload.revision }))
      .addCase(gameStateReceived, (state, { payload }) => {
        if (payload.revision < state.revision) return;
        state.players[payload.playerId] = payload.state as Draft<GameSnapshot>;
        state.revision = payload.revision;
      })
      .addCase(spectrumReceived, (state, { payload }) => {
        if (payload.revision < state.revision) return;
        state.spectrums[payload.playerId] = [...payload.spectrum];
        state.revision = payload.revision;
      });
  },
});

export const gameReducer = gameSlice.reducer;

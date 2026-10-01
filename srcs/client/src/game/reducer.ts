import { createSlice, type Draft } from '@reduxjs/toolkit';
import { createBoard, dropPosition, mergePiece } from '../../../shared/game/board.ts';
import type { ActivePiece, Board, GameSnapshot } from '../../../shared/game/types.ts';
import { gameStarted, gameStateReceived, joinRequested, leaveRequested, spectrumReceived } from '../app/actions.ts';

// How many line clears and incoming penalties each board has shown this round; a new count replays its animation.
export interface BoardEffects {
  readonly clears: number;
  readonly penalties: number;
}

export interface GameSliceState {
  readonly revision: number;
  readonly players: Readonly<Record<string, GameSnapshot>>;
  readonly spectrums: Readonly<Record<string, readonly number[]>>;
  readonly effects: Readonly<Record<string, BoardEffects>>;
}

const initialState: GameSliceState = { revision: -1, players: {}, spectrums: {}, effects: {} };

export const NO_EFFECTS: BoardEffects = { clears: 0, penalties: 0 };

const EMPTY_BOARD = createBoard();

// Board as drawn: settled cells plus the active piece; empty until the server sends a snapshot.
export const boardOf = (snapshot: GameSnapshot | undefined): Board =>
  snapshot === undefined ? EMPTY_BOARD : snapshot.active ? mergePiece(snapshot.board, snapshot.active) : snapshot.board;

// Where the active piece would land (the ghost).
export const ghostOf = (snapshot: GameSnapshot | undefined): ActivePiece | null =>
  snapshot?.active ? dropPosition(snapshot.board, snapshot.active) : null;

export const penaltyRows = (board: Board) => board.filter((row) => row.every((cell) => cell === 'penalty')).length;

const effectsAfter = (effects: BoardEffects, previous: GameSnapshot | undefined, next: GameSnapshot): BoardEffects =>
  previous === undefined
    ? effects
    : {
        clears: effects.clears + (next.lines > previous.lines ? 1 : 0),
        penalties: effects.penalties + (penaltyRows(next.board) > penaltyRows(previous.board) ? 1 : 0),
      };

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
        const { playerId } = payload;
        state.effects[playerId] = effectsAfter(state.effects[playerId] ?? NO_EFFECTS, state.players[playerId], payload.state);
        state.players[playerId] = payload.state as Draft<GameSnapshot>;
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

import type { UnknownAction } from '@reduxjs/toolkit';

// Game slice: pure transitions, replaced by the server's game:state.
type GameState = Record<string, never>;

const initialState: GameState = {};

export const gameReducer = (state: GameState = initialState, _action: UnknownAction): GameState => state;

import type { UnknownAction } from '@reduxjs/toolkit';

// Local game state: pure transitions built on board / pieces / collision,
// reconciled with the authoritative state sent by the server.
type GameState = Record<string, never>;

const initialState: GameState = {};

export const gameReducer = (state: GameState = initialState, _action: UnknownAction): GameState => state;

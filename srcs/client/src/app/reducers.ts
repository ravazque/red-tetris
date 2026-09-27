import { combineReducers } from '@reduxjs/toolkit';
import { gameReducer } from '../game/reducer.ts';

// Room / connection state driven by socket events goes here next to game.
export const rootReducer = combineReducers({ game: gameReducer });

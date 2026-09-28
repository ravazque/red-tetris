import { combineReducers } from '@reduxjs/toolkit';
import { gameReducer } from '../game/reducer.ts';
import { roomReducer } from '../room/reducer.ts';

// One key per slice; opponents joins here.
export const rootReducer = combineReducers({ game: gameReducer, room: roomReducer });

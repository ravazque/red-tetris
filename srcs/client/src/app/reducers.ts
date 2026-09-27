import { combineReducers } from '@reduxjs/toolkit';
import { gameReducer } from '../game/reducer.ts';

// One key per slice; room and opponents join game here.
export const rootReducer = combineReducers({ game: gameReducer });

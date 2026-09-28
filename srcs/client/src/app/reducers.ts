import { combineReducers } from '@reduxjs/toolkit';
import { gameReducer } from '../game/reducer.ts';
import { pongReducer } from '../pong/reducer.ts';
import { roomReducer } from '../room/reducer.ts';

export const rootReducer = combineReducers({ game: gameReducer, pong: pongReducer, room: roomReducer });

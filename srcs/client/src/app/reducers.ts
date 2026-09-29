import { combineReducers } from '@reduxjs/toolkit';
import { connectionReducer } from '../connection/reducer.ts';
import { gameReducer } from '../game/reducer.ts';
import { pongReducer } from '../pong/reducer.ts';
import { profileReducer } from '../profile/reducer.ts';
import { roomReducer } from '../room/reducer.ts';

export const rootReducer = combineReducers({
  connection: connectionReducer,
  game: gameReducer,
  pong: pongReducer,
  profile: profileReducer,
  room: roomReducer,
});

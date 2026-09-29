import { createSlice } from '@reduxjs/toolkit';
import { joinRequested } from '../app/actions.ts';

export interface ProfileState {
  readonly playerName: string;
}

const initialState: ProfileState = { playerName: '' };

// Name of the last join, so the home screen keeps it filled in after leaving a room.
const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(joinRequested, (state, { payload }) => {
      state.playerName = payload.playerName;
    });
  },
});

export const profileReducer = profileSlice.reducer;

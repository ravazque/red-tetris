import { createSlice } from '@reduxjs/toolkit';
import { connectionChanged } from '../app/actions.ts';

export interface ConnectionState {
  readonly online: boolean;
}

const initialState: ConnectionState = { online: true };

// Socket status, reported by socketMiddleware.ts on disconnect and reconnect (#23, #26).
const connectionSlice = createSlice({
  name: 'connection',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(connectionChanged, (state, { payload }) => {
      state.online = payload;
    });
  },
});

export const connectionReducer = connectionSlice.reducer;

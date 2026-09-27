import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from './reducers.ts';
import { socketMiddleware } from './socketMiddleware.ts';

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(socketMiddleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

import { createAction } from '@reduxjs/toolkit';
import type {
  HostChangedPayload,
  RoomCommandPayload,
  RoomErrorPayload,
  RoomJoinPayload,
  RoomStatePayload,
} from '../../../shared/types.ts';

// Boundary with socketMiddleware.ts: *Requested → socket command, the rest ← server event.
export const joinRequested = createAction<RoomJoinPayload>('room/joinRequested');
export const leaveRequested = createAction<RoomCommandPayload>('room/leaveRequested');
export const roomStateReceived = createAction<RoomStatePayload>('room/stateReceived');
export const roomErrorReceived = createAction<RoomErrorPayload>('room/errorReceived');
export const hostChanged = createAction<HostChangedPayload>('room/hostChanged');

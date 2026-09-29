import { ROOM_MODES, type RoomMode } from '../../../shared/constants.ts';

// Labels and start rules of the room modes (ROOM_MODES in shared/constants.ts); the creator fixes the mode.
export const MODE_LABEL: Record<RoomMode, string> = { solo: 'Solo', versus: 'Versus', pontrix: 'Pon-Trix' };

export const MODE_MIN_PLAYERS: Record<RoomMode, number> = { solo: 1, versus: 1, pontrix: 2 };

export const isRoomMode = (value: unknown): value is RoomMode => ROOM_MODES.includes(value as RoomMode);

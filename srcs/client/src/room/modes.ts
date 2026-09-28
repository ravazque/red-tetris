// Room modes, fixed by whoever creates the room; pending as ROOM_MODES in shared/constants.ts (#4).
export const ROOM_MODES = ['solo', 'versus', 'pontrix'] as const;

export type RoomMode = (typeof ROOM_MODES)[number];

export const MODE_LABEL: Record<RoomMode, string> = { solo: 'Solo', versus: 'Versus', pontrix: 'Pon-Trix' };

export const MODE_MIN_PLAYERS: Record<RoomMode, number> = { solo: 1, versus: 1, pontrix: 2 };

export const isRoomMode = (value: unknown): value is RoomMode => ROOM_MODES.includes(value as RoomMode);

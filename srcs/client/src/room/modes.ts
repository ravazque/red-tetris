import { ROOM_MODES, ROOM_RULES, type RoomMode, type RoomRule } from '../../../shared/constants.ts';

// Labels and seats of the room modes (ROOM_MODES in shared/constants.ts); the creator fixes the mode and a round starts once every seat is taken and ready.
export const MODE_LABEL: Record<RoomMode, string> = { solo: 'Solo', versus: 'Versus', pontrix: 'Pon-Trix' };

export const MODE_SEATS: Record<RoomMode, number> = { solo: 1, versus: 2, pontrix: 2 };

export const isRoomMode = (value: unknown): value is RoomMode => ROOM_MODES.includes(value as RoomMode);

// How a versus room ends, picked on its card (Pon-Trix always plays score).
export const RULE_LABEL: Record<RoomRule, string> = { survival: 'Last standing', score: 'Best score' };

export const RULE_ABOUT: Record<RoomRule, string> = {
  survival: 'Top out and you lose: the player who can keep playing wins.',
  score: 'Top out and you wait: once both are out, the higher score wins.',
};

export const isRoomRule = (value: unknown): value is RoomRule => ROOM_RULES.includes(value as RoomRule);

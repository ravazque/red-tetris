import { NAME_PATTERN, type RoomMode } from '../../../shared/constants.ts';
import { isRoomMode } from './modes.ts';

// Router state of /<room>/<player>; lost on reload, so the URL alone must be enough to play (as a versus join).
export interface RoomLocationState {
  readonly mode?: RoomMode;
}

export const isValidName = (value: string) => NAME_PATTERN.test(value);

export const createRoomId = () => crypto.randomUUID().slice(0, 8);

export const roomPath = (room: string, player: string) => `/${room}/${player}`;

export const locationMode = (state: unknown): RoomMode => {
  const mode = (state as Partial<RoomLocationState> | null)?.mode;
  return isRoomMode(mode) ? mode : 'versus';
};

// Router state of the home screen after a rejected /<room>/<player> URL: the values to fix.
export interface RejectedLocationState {
  readonly player: string;
  readonly room: string;
}

export const locationRejected = (state: unknown): RejectedLocationState | null => {
  const { player, room } = (state as Partial<RejectedLocationState> | null) ?? {};
  return typeof player === 'string' && typeof room === 'string' ? { player, room } : null;
};

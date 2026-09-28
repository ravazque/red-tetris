import { NAME_PATTERN } from '../../../shared/constants.ts';
import { isRoomMode, type RoomMode } from './modes.ts';

// Router state of /<room>/<player>; lost on reload, so the URL alone must be enough to play (as a versus join).
export interface RoomLocationState {
  readonly mode: RoomMode;
}

export const isValidName = (value: string) => NAME_PATTERN.test(value);

export const createRoomId = () => crypto.randomUUID().slice(0, 8);

export const roomPath = (room: string, player: string) => `/${room}/${player}`;

export const locationMode = (state: unknown): RoomMode => {
  const mode = (state as Partial<RoomLocationState> | null)?.mode;
  return isRoomMode(mode) ? mode : 'versus';
};

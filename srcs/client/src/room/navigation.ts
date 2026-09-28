import { NAME_PATTERN, type RoomMode } from '../../../shared/constants.ts';

// Router state of /<room>/<player>; lost on reload, so the URL alone must be enough to play.
export interface RoomLocationState {
  readonly mode?: RoomMode;
}

export const isValidName = (value: string) => NAME_PATTERN.test(value);

export const createRoomId = () => crypto.randomUUID().slice(0, 8);

export const roomPath = (room: string, player: string) => `/${room}/${player}`;

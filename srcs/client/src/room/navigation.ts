import { NAME_PATTERN, type ErrorCode, type RoomMode, type RoomRule } from '../../../shared/constants.ts';
import { isRoomMode, isRoomRule } from './modes.ts';

// Router state of /<room>/<player>: the mode a card creates, or join for the home Join (existing rooms only); a bare URL joins or creates a versus room.
export interface RoomLocationState {
  readonly mode?: RoomMode;
  readonly rule?: RoomRule;
  readonly join?: true;
}

export const isValidName = (value: string) => NAME_PATTERN.test(value);

export const createRoomId = () => crypto.randomUUID().slice(0, 8);

export const roomPath = (room: string, player: string) => `/${room}/${player}`;

export const locationMode = (state: unknown): RoomMode => {
  const mode = (state as Partial<RoomLocationState> | null)?.mode;
  return isRoomMode(mode) ? mode : 'versus';
};

export const isJoinLocation = (state: unknown) => (state as Partial<RoomLocationState> | null)?.join === true;

export const locationRule = (state: unknown): RoomRule | undefined => {
  const rule = (state as Partial<RoomLocationState> | null)?.rule;
  return isRoomRule(rule) ? rule : undefined;
};

// Router state of the home screen after a rejected URL or room:join: the values to fix and, from the server, its error code.
export interface RejectedLocationState {
  readonly player?: string;
  readonly room: string;
  readonly code?: ErrorCode;
}

export const locationRejected = (state: unknown): RejectedLocationState | null => {
  const { player, room, code } = (state as Partial<RejectedLocationState> | null) ?? {};
  if (typeof room !== 'string') return null;
  return {
    room,
    ...(typeof player === 'string' && { player }),
    ...(typeof code === 'string' && { code }),
  };
};

export interface ResolvedPath {
  readonly path: string;
  readonly rejected: RejectedLocationState | null;
}

const decodeSegments = (pathname: string) => {
  try {
    return pathname.replace(/^\/|\/$/g, '').split('/').map(decodeURIComponent);
  } catch {
    return null;
  }
};

// Where a typed path leads: its clean form when playable, / otherwise, with the values to fix when it has the shape of /<room>[/<player>].
export const resolvePath = (pathname: string): ResolvedPath => {
  const segments = pathname === '/' ? [] : decodeSegments(pathname);
  if (segments === null || segments.length > 2 || segments.includes('')) return { path: '/', rejected: null };
  const [room, player] = segments;
  if (room === undefined) return { path: '/', rejected: null };
  if (player === undefined) return isValidName(room) ? { path: `/${room}`, rejected: null } : { path: '/', rejected: { room } };
  return isValidName(room) && isValidName(player) ? { path: roomPath(room, player), rejected: null } : { path: '/', rejected: { player, room } };
};

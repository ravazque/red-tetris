import { describe, expect, it } from 'vitest';
import type { RoomErrorPayload, RoomStatePayload } from '../../../shared/types.ts';
import {
  hostChanged,
  joinRequested,
  leaveRequested,
  roomErrorReceived,
  roomStateReceived,
} from '../../src/app/actions.ts';
import { roomReducer, type RoomState } from '../../src/room/reducer.ts';

const roomState = (overrides: Partial<RoomStatePayload> = {}): RoomStatePayload => ({
  roomId: 'room1',
  revision: 2,
  phase: 'waiting',
  selfPlayerId: 'p2',
  hostPlayerId: 'p1',
  players: [
    { playerId: 'p1', name: 'alice', isHost: true, isAlive: true },
    { playerId: 'p2', name: 'bob', isHost: false, isAlive: true },
  ],
  ...overrides,
});

const roomFull: RoomErrorPayload = { roomId: 'room1', event: 'room:join', code: 'ROOM_FULL', message: 'Room is full' };

const joined = (): RoomState =>
  roomReducer(roomReducer(undefined, joinRequested({ roomId: 'room1', playerName: 'bob' })), roomStateReceived(roomState()));

describe('roomReducer', () => {
  it('starts empty', () => {
    expect(roomReducer(undefined, { type: 'unknown' })).toMatchObject({ roomId: null, phase: null, players: [] });
  });

  it('resets to the requested room on join', () => {
    const state = roomReducer(roomReducer(joined(), roomErrorReceived(roomFull)), joinRequested({ roomId: 'room2', playerName: 'bob' }));

    expect(state).toMatchObject({ roomId: 'room2', phase: null, players: [], error: null, revision: -1 });
  });

  it('mirrors room:state', () => {
    expect(joined()).toMatchObject({ phase: 'waiting', selfPlayerId: 'p2', hostPlayerId: 'p1', revision: 2 });
    expect(joined().players.map(({ name }) => name)).toEqual(['alice', 'bob']);
  });

  it('drops room:state from another room or with an older revision', () => {
    const state = joined();

    expect(roomReducer(state, roomStateReceived(roomState({ roomId: 'room2', revision: 9 })))).toBe(state);
    expect(roomReducer(state, roomStateReceived(roomState({ revision: 1, phase: 'running' })))).toBe(state);
  });

  it('applies host:changed unless it is stale', () => {
    const changed = roomReducer(joined(), hostChanged({ roomId: 'room1', revision: 3, playerId: 'p2', playerName: 'bob' }));

    expect(changed).toMatchObject({ hostPlayerId: 'p2', revision: 3 });
    expect(roomReducer(changed, hostChanged({ roomId: 'room1', revision: 2, playerId: 'p1', playerName: 'alice' }))).toBe(changed);
  });

  it('keeps the last room:error', () => {
    expect(roomReducer(joined(), roomErrorReceived(roomFull)).error).toEqual(roomFull);
  });

  it('resets on leave', () => {
    expect(roomReducer(joined(), leaveRequested({ roomId: 'room1' }))).toEqual(roomReducer(undefined, { type: 'unknown' }));
  });
});

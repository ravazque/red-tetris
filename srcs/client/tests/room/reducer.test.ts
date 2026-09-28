import { describe, expect, it } from 'vitest';
import type { RoomErrorPayload, RoomStatePayload } from '../../../shared/types.ts';
import {
  gameFinished,
  gameStarted,
  hostChanged,
  joinRequested,
  leaveRequested,
  roomErrorReceived,
  roomStateReceived,
} from '../../src/app/actions.ts';
import { isSelfHost, roomReducer, type RoomState } from '../../src/room/reducer.ts';

const roomState = (overrides: Partial<RoomStatePayload> = {}): RoomStatePayload => ({
  roomId: 'room1',
  revision: 2,
  phase: 'waiting',
  mode: 'versus',
  selfPlayerId: 'p2',
  hostPlayerId: 'p1',
  players: [
    { playerId: 'p1', name: 'alice', isAlive: true },
    { playerId: 'p2', name: 'bob', isAlive: true },
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

  it('keeps the last room:error until the next room:state', () => {
    const failed = roomReducer(joined(), roomErrorReceived(roomFull));

    expect(failed.error).toEqual(roomFull);
    expect(roomReducer(failed, roomStateReceived(roomState({ revision: 3 }))).error).toBeNull();
  });

  it('follows game:started and game:finished unless they are stale', () => {
    const started = roomReducer(joined(), gameStarted({ roomId: 'room1', revision: 3, phase: 'running', playerIds: ['p1', 'p2'] }));
    const finished = roomReducer(started, gameFinished({ roomId: 'room1', revision: 4, winnerPlayerId: 'p1' }));

    expect(started).toMatchObject({ phase: 'running', winnerPlayerId: null, revision: 3 });
    expect(finished).toMatchObject({ phase: 'finished', winnerPlayerId: 'p1', revision: 4 });
    expect(roomReducer(finished, gameStarted({ roomId: 'room1', revision: 3, phase: 'running', playerIds: [] }))).toBe(finished);
    expect(roomReducer(started, gameFinished({ roomId: 'room2', revision: 9, winnerPlayerId: null }))).toBe(started);
  });

  it('tells whether the local player is the host', () => {
    expect(isSelfHost(roomReducer(undefined, { type: 'unknown' }))).toBe(false);
    expect(isSelfHost(joined())).toBe(false);
    expect(isSelfHost(roomReducer(joined(), roomStateReceived(roomState({ revision: 3, selfPlayerId: 'p1' }))))).toBe(true);
  });

  it('resets on leave', () => {
    expect(roomReducer(joined(), leaveRequested({ roomId: 'room1' }))).toEqual(roomReducer(undefined, { type: 'unknown' }));
  });
});

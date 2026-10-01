import { describe, expect, it } from 'vitest';
import type { RoomErrorPayload, RoomStatePayload } from '../../../shared/types.ts';
import {
  gameFinished,
  gamePaused,
  gameResumed,
  gameStarted,
  hostChanged,
  joinRequested,
  leaveRequested,
  roomErrorReceived,
  roomStateReceived,
} from '../../src/app/actions.ts';
import { hasStarted, isSelfHost, roomReducer, selectSeats, type RoomState } from '../../src/room/reducer.ts';

const roomState = (overrides: Partial<RoomStatePayload> = {}): RoomStatePayload => ({
  roomId: 'room1',
  revision: 2,
  phase: 'waiting',
  mode: 'versus',
  rule: 'survival',
  selfPlayerId: 'p2',
  hostPlayerId: 'p1',
  players: [
    { playerId: 'p1', name: 'alice', isAlive: true, isReady: false, isConnected: true },
    { playerId: 'p2', name: 'bob', isAlive: true, isReady: false, isConnected: true },
  ],
  closed: null,
  ...overrides,
});

const roomFull: RoomErrorPayload = { roomId: 'room1', event: 'room:join', code: 'ROOM_FULL', message: 'Room is full' };

const joined = (): RoomState =>
  roomReducer(roomReducer(undefined, joinRequested({ roomId: 'room1', playerName: 'bob' })), roomStateReceived(roomState()));

describe('roomReducer', () => {
  it('starts empty', () => {
    expect(roomReducer(undefined, { type: 'unknown' })).toMatchObject({ roomId: null, phase: null, players: [] });
  });

  it('drops the pause once the room is no longer running', () => {
    const paused = { ...joined(), phase: 'running' as const, pause: { playerId: 'p1', graceMs: 15000, revision: 3 } };

    expect(roomReducer(paused, roomStateReceived(roomState({ revision: 3, phase: 'running' }))).pause).not.toBeNull();
    expect(roomReducer(paused, roomStateReceived(roomState({ revision: 4, phase: 'waiting' }))).pause).toBeNull();
  });

  it('keeps the room rule from the join request, then from the server', () => {
    const asked = roomReducer(undefined, joinRequested({ roomId: 'room1', playerName: 'bob', mode: 'versus', rule: 'score' }));
    expect(asked.rule).toBe('score');

    expect(roomReducer(asked, roomStateReceived(roomState({ rule: 'survival' }))).rule).toBe('survival');
  });

  it('keeps the closure of a room that lost its rival, and forgets it on the next join', () => {
    const closure = { playerName: 'alice', reason: 'timeout' as const };
    const closed = roomReducer(joined(), roomStateReceived(roomState({ revision: 3, phase: 'finished', players: [roomState().players[1]], closed: closure })));

    expect(closed).toMatchObject({ phase: 'finished', closed: closure });
    expect(roomReducer(closed, joinRequested({ roomId: 'room2', playerName: 'bob' })).closed).toBeNull();
  });

  it('drops errors about another room, such as late replies after leaving', () => {
    const elsewhere = roomReducer(joined(), roomErrorReceived({ ...roomFull, roomId: 'room9' }));
    const left = roomReducer(roomReducer(joined(), leaveRequested({ roomId: 'room1' })), roomErrorReceived(roomFull));

    expect(elsewhere.error).toBeNull();
    expect(left.error).toBeNull();
    expect(roomReducer(joined(), roomErrorReceived({ ...roomFull, roomId: null })).error).toMatchObject({ code: 'ROOM_FULL' });
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

  it('freezes on game:paused until game:resumed, ignoring stale or foreign events', () => {
    const started = roomReducer(joined(), gameStarted({ roomId: 'room1', revision: 3, phase: 'running', playerIds: ['p1', 'p2'] }));
    const paused = roomReducer(started, gamePaused({ roomId: 'room1', revision: 4, playerId: 'p1', graceMs: 15000 }));

    expect(paused.pause).toEqual({ playerId: 'p1', graceMs: 15000, revision: 4 });
    expect(roomReducer(paused, gameResumed({ roomId: 'room1', revision: 5 })).pause).toBeNull();
    expect(roomReducer(paused, gameResumed({ roomId: 'room1', revision: 3 }))).toBe(paused);
    expect(roomReducer(started, gamePaused({ roomId: 'room2', revision: 9, playerId: 'p1', graceMs: 1 }))).toBe(started);
  });

  it('keeps why the round ended and clears the pause', () => {
    const started = roomReducer(joined(), gameStarted({ roomId: 'room1', revision: 3, phase: 'running', playerIds: ['p1', 'p2'] }));
    const paused = roomReducer(started, gamePaused({ roomId: 'room1', revision: 4, playerId: 'p1', graceMs: 15000 }));
    const finished = roomReducer(paused, gameFinished({ roomId: 'room1', revision: 5, winnerPlayerId: 'p2', reason: 'timeout' }));

    expect(finished).toMatchObject({ phase: 'finished', winnerPlayerId: 'p2', finishReason: 'timeout', pause: null });
    expect(roomReducer(started, gameFinished({ roomId: 'room1', revision: 4, winnerPlayerId: 'p1' })).finishReason).toBeNull();
    expect(roomReducer(finished, gameStarted({ roomId: 'room1', revision: 6, phase: 'running', playerIds: [] })).finishReason).toBeNull();
  });

  it('tells whether the first round has started', () => {
    const started = roomReducer(joined(), gameStarted({ roomId: 'room1', revision: 3, phase: 'running', playerIds: ['p1'] }));

    expect(hasStarted(roomReducer(undefined, { type: 'unknown' }))).toBe(false);
    expect(hasStarted(joined())).toBe(false);
    expect(hasStarted(started)).toBe(true);
    expect(hasStarted(roomReducer(started, gameFinished({ roomId: 'room1', revision: 4, winnerPlayerId: null })))).toBe(true);
  });

  it('tells whether the local player is the host', () => {
    expect(isSelfHost(roomReducer(undefined, { type: 'unknown' }))).toBe(false);
    expect(isSelfHost(joined())).toBe(false);
    expect(isSelfHost(roomReducer(joined(), roomStateReceived(roomState({ revision: 3, selfPlayerId: 'p1' }))))).toBe(true);
  });

  it('keeps the requested mode until room:state brings the room\'s own', () => {
    const requested = roomReducer(undefined, joinRequested({ roomId: 'room1', playerName: 'bob', mode: 'pontrix' }));

    expect(requested.mode).toBe('pontrix');
    expect(roomReducer(undefined, joinRequested({ roomId: 'room1', playerName: 'bob' })).mode).toBeNull();
    expect(roomReducer(requested, roomStateReceived(roomState())).mode).toBe('versus');
  });

  it('seats the players in join order, or only the local player before the server answers', () => {
    expect(selectSeats(roomReducer(undefined, { type: 'unknown' }), 'bob')).toEqual([
      { playerId: null, name: 'bob', self: true },
    ]);
    expect(selectSeats(joined(), 'bob')).toEqual([
      { playerId: 'p1', name: 'alice', self: false },
      { playerId: 'p2', name: 'bob', self: true },
    ]);
  });

  it('resets on leave', () => {
    expect(roomReducer(joined(), leaveRequested({ roomId: 'room1' }))).toEqual(roomReducer(undefined, { type: 'unknown' }));
  });
});

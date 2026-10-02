import { describe, expect, it } from 'vitest';
import { gameStarted, joinRequested, leaveRequested, pongStateReceived } from '../../src/app/actions.ts';
import { PONG_CENTER, pongReducer } from '../../src/pong/reducer.ts';

const state = { ball: { x: 2, y: 3 }, paddles: { p1: 4 }, goals: { p1: 1 }, serving: false, vanish: null };
const received = (revision: number) => pongReducer(undefined, pongStateReceived({ roomId: 'room1', revision, state }));

describe('pongReducer', () => {
  it('keeps the latest pong:state', () => {
    expect(received(2)).toEqual({ revision: 2, state });
  });

  it('drops stale pong:state', () => {
    const current = received(2);

    expect(pongReducer(current, pongStateReceived({ roomId: 'room1', revision: 1, state }))).toBe(current);
  });

  it('starts over on join, leave and game start', () => {
    expect(pongReducer(received(2), joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'pontrix' })).state).toBeNull();
    expect(pongReducer(received(2), leaveRequested({ roomId: 'room1' })).state).toBeNull();
    expect(pongReducer(received(2), gameStarted({ roomId: 'room1', revision: 6, phase: 'running', playerIds: [] }))).toEqual({
      revision: 6,
      state: null,
    });
  });

  it('centres the ball in the arena', () => {
    expect(PONG_CENTER).toEqual({ x: 13, y: 10 });
  });
});

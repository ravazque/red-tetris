import { describe, expect, it } from 'vitest';
import { PONG_MAX_STALL_TICKS, Pong } from '../../src/domain/Pong.ts';
import type { GameSnapshot } from '../../../shared/game/types.ts';

const emptySnapshot = (): GameSnapshot => ({
  board: Array.from({ length: 20 }, () => Array(10).fill(null)),
  active: null,
  next: null,
  isAlive: true,
  lastSequence: 0,
  score: 0,
  lines: 0,
});

describe('Pong', () => {
  it('starts in the centre and moves a paddle within its lane', () => {
    const pong = new Pong(['alice', 'bobby']);
    expect(pong.snapshot()).toMatchObject({ ball: { x: 13, y: 10 }, paddles: { alice: 10, bobby: 10 } });

    pong.input('alice', 1);
    pong.tick([emptySnapshot(), emptySnapshot()]);
    expect(pong.snapshot().paddles.alice).toBeGreaterThan(10);

    pong.input('alice', -1);
    for (let tick = 0; tick < 100; tick += 1) pong.tick([emptySnapshot(), emptySnapshot()]);
    expect(pong.snapshot().paddles.alice).toBeGreaterThanOrEqual(2);
    expect(pong.snapshot().paddles.alice).toBeLessThanOrEqual(18);
  });

  it('scores a goal and serves again from the centre', () => {
    const pong = new Pong(['alice', 'bobby']);
    const events = [];
    for (let tick = 0; tick < 100; tick += 1) {
      const next = pong.tick([emptySnapshot(), emptySnapshot()]);
      events.push(...next);
      if (next.some((event) => event.type === 'goal')) break;
    }

    expect(events).toContainEqual({ type: 'goal', targetPlayerId: 'bobby', sourcePlayerId: 'alice' });
    expect(pong.snapshot()).toMatchObject({ ball: { x: 13, y: 10 }, goals: { alice: 0, bobby: 1 } });
  });

  it('rebounds from a settled block without modifying the Tetris snapshot', () => {
    const left = emptySnapshot();
    const board = left.board.map((row, y) => y === 10 ? row.map((cell, x) => x === 0 ? 'T' : cell) : row);
    const blocked = { ...left, board };
    const pong = new Pong(['alice', 'bobby']);

    for (let tick = 0; tick < 20; tick += 1) pong.tick([emptySnapshot(), blocked]);

    expect(pong.snapshot().ball.x).toBeLessThan(16);
    expect(blocked.board[10][0]).toBe('T');
  });

  it('resets a stalled rally instead of allowing an infinite wall lock', () => {
    const pong = new Pong(['alice', 'bobby']);
    const wall = emptySnapshot();
    const board = wall.board.map((row) => row.map(() => 'T' as const));
    const blocked = { ...wall, board };

    const states = [];
    for (let tick = 0; tick < PONG_MAX_STALL_TICKS; tick += 1) states.push(pong.tick([blocked, blocked])[0]);

    expect(states).toContainEqual({ type: 'state', state: expect.objectContaining({ ball: { x: 13, y: 10 } }) });
  });
});

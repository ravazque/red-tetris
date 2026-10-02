import { describe, expect, it } from 'vitest';
import { PONG_BALL_SPEED, PONG_MAX_STALL_TICKS, PONG_PADDLE_SPEED, PONG_SERVE_DELAY_TICKS, PONG_SPEED_STEP, PONG_SPEED_STEP_TICKS, Pong } from '../../src/domain/Pong.ts';
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
    expect(pong.snapshot().ball.x).toBeCloseTo(13.225);
    expect(pong.snapshot().paddles.alice).toBeGreaterThan(10);

    pong.input('alice', -1);
    for (let tick = 0; tick < 100; tick += 1) pong.tick([emptySnapshot(), emptySnapshot()]);
    expect(pong.snapshot().paddles.alice).toBeGreaterThanOrEqual(2);
    expect(pong.snapshot().paddles.alice).toBeLessThanOrEqual(18);
  });

  it('counts a goal for the scorer, marks the conceding player as the penalty target and serves again', () => {
    const pong = new Pong(['alice', 'bobby']);
    const events = [];
    for (let tick = 0; tick < 100; tick += 1) {
      const next = pong.tick([emptySnapshot(), emptySnapshot()]);
      events.push(...next);
      if (next.some((event) => event.type === 'goal')) break;
    }

    expect(events).toContainEqual({ type: 'goal', targetPlayerId: 'bobby', sourcePlayerId: 'alice' });
    expect(pong.snapshot()).toMatchObject({ ball: { x: 13, y: 10 }, goals: { alice: 1, bobby: 0 } });
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

  it('steps the ball speed up every 15 s, 2.5x at 2 minutes and 4x at 4 minutes, with the paddles up to 2x', () => {
    const pong = new Pong(['alice', 'bobby']);
    const empty: [GameSnapshot, GameSnapshot] = [emptySnapshot(), emptySnapshot()];
    let played = 0;
    const tick = () => {
      pong.tick(empty);
      played += 1;
    };
    const playTo = (ticks: number) => {
      while (played < ticks) tick();
    };
    // Fastest horizontal step over a few ticks; serves back to the centre are left out.
    const fastest = () => {
      const steps = [];
      for (let i = 0; i < 20; i += 1) {
        const before = pong.snapshot().ball.x;
        tick();
        steps.push(Math.abs(pong.snapshot().ball.x - before));
      }
      return Math.max(...steps.filter((step) => step < 1)) / PONG_BALL_SPEED;
    };
    // One paddle step down and back, from the resting centre.
    const paddleStep = () => {
      pong.input('alice', 1);
      tick();
      const step = pong.snapshot().paddles.alice - 10;
      pong.input('alice', -1);
      tick();
      pong.input('alice', 0);
      return step / PONG_PADDLE_SPEED;
    };
    const step = PONG_SPEED_STEP_TICKS;

    expect(fastest()).toBeCloseTo(1, 3);
    expect(paddleStep()).toBeCloseTo(1, 3);
    playTo(step - 20);
    expect(fastest()).toBeCloseTo(1, 3);
    expect(fastest()).toBeCloseTo(1 + PONG_SPEED_STEP, 3);
    playTo(step * 8);
    expect(fastest()).toBeCloseTo(2.5, 3);
    expect(paddleStep()).toBeCloseTo(1.5, 3);
    playTo(step * 16);
    expect(fastest()).toBeCloseTo(4, 3);
    expect(paddleStep()).toBeCloseTo(2, 3);
    playTo(step * 24);
    expect(fastest()).toBeCloseTo(4, 3);
    expect(paddleStep()).toBeCloseTo(2, 3);
  });

  it('makes a stalled ball vanish, then serves it from the centre after a wait', () => {
    const pong = new Pong(['alice', 'bobby']);
    const wall = emptySnapshot();
    const blocked = { ...wall, board: wall.board.map((row) => row.map(() => 'T' as const)) };
    const players: [GameSnapshot, GameSnapshot] = [blocked, blocked];
    for (let tick = 1; tick < PONG_MAX_STALL_TICKS; tick += 1) pong.tick(players);
    const before = pong.snapshot().ball;
    expect(pong.snapshot()).toMatchObject({ serving: false, vanish: null });

    pong.tick(players);
    expect(pong.snapshot()).toMatchObject({ ball: { x: 13, y: 10 }, serving: true, vanish: { id: 1 } });
    const { vanish } = pong.snapshot();
    expect(Math.hypot((vanish?.x ?? 0) - before.x, (vanish?.y ?? 0) - before.y)).toBeLessThan(1);

    pong.input('alice', 1);
    for (let tick = 0; tick < PONG_SERVE_DELAY_TICKS; tick += 1) pong.tick(players);
    expect(pong.snapshot()).toMatchObject({ ball: { x: 13, y: 10 }, serving: false });
    expect(pong.snapshot().paddles.alice).toBeGreaterThan(10);

    pong.tick(players);
    expect(pong.snapshot().ball).not.toEqual({ x: 13, y: 10 });
  });
});

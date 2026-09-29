import { describe, expect, it } from 'vitest';
import {
  PONTRIX_PADDLE_MAX_Y,
  PONTRIX_PADDLE_MIN_Y,
  clampPaddleY,
  movePaddle,
} from '../../../../shared/game/pontrix.ts';

describe('clampPaddleY', () => {
  it('keeps the whole paddle inside the lane', () => {
    expect(PONTRIX_PADDLE_MIN_Y).toBe(2);
    expect(PONTRIX_PADDLE_MAX_Y).toBe(18);
    expect(clampPaddleY(-5)).toBe(2);
    expect(clampPaddleY(7.5)).toBe(7.5);
    expect(clampPaddleY(30)).toBe(18);
  });
});

describe('movePaddle', () => {
  it('moves up, down or not at all by the given distance', () => {
    expect(movePaddle(10, -1, 0.5)).toBe(9.5);
    expect(movePaddle(10, 1, 0.5)).toBe(10.5);
    expect(movePaddle(10, 0, 0.5)).toBe(10);
  });

  it('stops at the ends of the lane', () => {
    expect(movePaddle(2.2, -1, 1)).toBe(2);
    expect(movePaddle(17.9, 1, 1)).toBe(18);
  });
});

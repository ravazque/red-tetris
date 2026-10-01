import { describe, expect, it } from 'vitest';
import { PLACE_POINTS, clearPoints } from '../../../../shared/game/scoring.ts';

describe('scoring', () => {
  it('pays 100, 300, 500 and 800 for one to four cleared lines', () => {
    expect([1, 2, 3, 4].map(clearPoints)).toEqual([100, 300, 500, 800]);
  });

  it('pays nothing when no line is cleared', () => {
    expect(clearPoints(0)).toBe(0);
  });

  it('pays 10 per placed piece, so a line (2.5 pieces) is still worth far more from the clear', () => {
    expect(PLACE_POINTS).toBe(10);
    expect(2.5 * PLACE_POINTS).toBeLessThan(clearPoints(1));
  });
});

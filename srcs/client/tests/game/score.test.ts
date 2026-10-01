import { describe, expect, it } from 'vitest';
import { crownHolder, leadOf } from '../../src/game/score.ts';

describe('leadOf', () => {
  it('gives the leader, the margin and your share of the points', () => {
    const lead = leadOf(12450, 9800);

    expect(lead.leader).toBe('self');
    expect(lead.margin).toBe(2650);
    expect(lead.share).toBeCloseTo((12450 / 22250) * 100);
  });

  it('names the rival when the rival is ahead', () => {
    expect(leadOf(100, 400)).toEqual({ leader: 'rival', margin: 300, share: 20 });
  });

  it('splits the bar in half on a tie, including 0 to 0', () => {
    expect(leadOf(0, 0)).toEqual({ leader: null, margin: 0, share: 50 });
    expect(leadOf(300, 300)).toEqual({ leader: null, margin: 0, share: 50 });
  });
});

describe('crownHolder', () => {
  const scores: Record<string, number> = { p1: 300, p2: 100, p3: 300 };
  const scoreOf = (playerId: string) => scores[playerId] ?? 0;

  it('crowns the player strictly ahead', () => {
    expect(crownHolder('p1', 'p2', scoreOf)).toBe('p1');
    expect(crownHolder('p2', 'p1', scoreOf)).toBe('p1');
  });

  it('crowns nobody on a tie or without a rival', () => {
    expect(crownHolder('p1', 'p3', scoreOf)).toBeNull();
    expect(crownHolder('p1', undefined, scoreOf)).toBeNull();
    expect(crownHolder(null, 'p1', scoreOf)).toBeNull();
  });
});

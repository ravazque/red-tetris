import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BEST_SCORE_KEY, useBestScore } from '../../src/game/hooks.ts';

describe('useBestScore', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('shows the stored best while the current score is lower', () => {
    localStorage.setItem(BEST_SCORE_KEY, '20300');

    const { result } = renderHook(() => useBestScore(12450));

    expect(result.current).toBe(20300);
  });

  it('follows and stores the current score once it beats the best', () => {
    localStorage.setItem(BEST_SCORE_KEY, '300');
    const { result, rerender } = renderHook(({ score }) => useBestScore(score), { initialProps: { score: 100 } });

    rerender({ score: 500 });

    expect(result.current).toBe(500);
    expect(localStorage.getItem(BEST_SCORE_KEY)).toBe('500');
  });

  it('keeps the new best when a restart takes the score back to 0', () => {
    const { result, rerender } = renderHook(({ score }) => useBestScore(score), { initialProps: { score: 800 } });

    rerender({ score: 0 });

    expect(result.current).toBe(800);
  });

  it('starts from 0 when nothing valid is stored', () => {
    localStorage.setItem(BEST_SCORE_KEY, 'junk');

    expect(renderHook(() => useBestScore(0)).result.current).toBe(0);
  });

  it('still counts when the browser blocks storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(renderHook(() => useBestScore(100)).result.current).toBe(100);
  });
});

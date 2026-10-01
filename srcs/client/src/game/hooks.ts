import { useEffect, useState } from 'react';
import { useAppSelector } from '../app/hooks.ts';
import { NO_EFFECTS } from './reducer.ts';

// Latest game:state snapshot, spectrum and board effects of one player; undefined (no effects) until the server sends them.
export const usePlayerGame = (playerId: string | null | undefined) => ({
  snapshot: useAppSelector(({ game }) => (playerId ? game.players[playerId] : undefined)),
  spectrum: useAppSelector(({ game }) => (playerId ? game.spectrums[playerId] : undefined)),
  effects: useAppSelector(({ game }) => (playerId ? game.effects[playerId] : undefined)) ?? NO_EFFECTS,
});

export const BEST_SCORE_KEY = 'red-tetris:best';

const readBest = () => {
  try {
    return Number(localStorage.getItem(BEST_SCORE_KEY)) || 0;
  } catch {
    return 0;
  }
};

// Solo record in this browser's localStorage: stored as soon as the score beats it; blocked storage only loses persistence.
export const useBestScore = (score: number) => {
  const [best, setBest] = useState(readBest);

  useEffect(() => {
    if (score <= best) return;
    setBest(score);
    try {
      localStorage.setItem(BEST_SCORE_KEY, String(score));
    } catch {}
  }, [score, best]);

  return Math.max(best, score);
};

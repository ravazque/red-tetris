import { PIECE_TYPES } from './pieces.ts';
import type { PieceType } from './types.ts';

// Seeded 7-bag: bag n is a shuffle drawn from (seed, n), so every player of a room gets the same pieces at their own pace.
const random = (seed: number) => {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), state | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const pieceBag = (seed: number, bag: number): PieceType[] => {
  const next = random(seed ^ Math.imul(bag + 1, 0x9e3779b9));
  const types = [...PIECE_TYPES];
  for (let i = types.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }
  return types;
};

export const pieceAt = (seed: number, index: number): PieceType =>
  pieceBag(seed, Math.floor(index / PIECE_TYPES.length))[index % PIECE_TYPES.length];

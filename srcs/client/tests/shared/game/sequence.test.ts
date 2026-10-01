import { describe, expect, it } from 'vitest';
import { PIECE_TYPES } from '../../../../shared/game/pieces.ts';
import { pieceAt, pieceBag } from '../../../../shared/game/sequence.ts';

const sequence = (seed: number, length: number) => Array.from({ length }, (_, index) => pieceAt(seed, index));

describe('pieceBag', () => {
  it.each([0, 1, 42, -7, 2 ** 31 - 1])('holds each piece once (seed %i)', (seed) => {
    for (let bag = 0; bag < 5; bag += 1) expect([...pieceBag(seed, bag)].sort()).toEqual([...PIECE_TYPES].sort());
  });
});

describe('pieceAt', () => {
  it('gives the same sequence for the same seed', () => {
    expect(sequence(1234, 50)).toEqual(sequence(1234, 50));
  });

  it('changes with the seed', () => {
    expect(sequence(1, 21)).not.toEqual(sequence(2, 21));
  });

  it('reads the bags in order', () => {
    expect(sequence(99, 14)).toEqual([...pieceBag(99, 0), ...pieceBag(99, 1)]);
  });
});

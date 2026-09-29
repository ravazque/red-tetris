import { describe, expect, it } from 'vitest';
import { BOARD_WIDTH } from '../../../../shared/constants.ts';
import {
  PIECE_SHAPES,
  PIECE_TYPES,
  movePiece,
  pieceCells,
  rotatePiece,
  spawnPiece,
} from '../../../../shared/game/pieces.ts';

describe('PIECE_SHAPES', () => {
  it('has the 7 tetriminos', () => {
    expect([...PIECE_TYPES].sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z']);
  });

  it.each(PIECE_TYPES)('%s has 4 rotation states of 4 distinct cells', (type) => {
    const states = PIECE_SHAPES[type];

    expect(states).toHaveLength(4);
    for (const cells of states) {
      expect(new Set(cells.map(([x, y]) => `${x},${y}`)).size).toBe(4);
    }
  });
});

describe('spawnPiece', () => {
  it.each(PIECE_TYPES)('%s spawns in rotation 0 touching the top, inside the board', (type) => {
    const piece = spawnPiece(type);
    const cells = pieceCells(piece);

    expect(piece.rotation).toBe(0);
    expect(Math.min(...cells.map(([, y]) => y))).toBe(0);
    expect(cells.every(([x]) => x >= 0 && x < BOARD_WIDTH)).toBe(true);
  });

  it('centres the pieces', () => {
    expect(pieceCells(spawnPiece('I')).map(([x]) => x)).toEqual([3, 4, 5, 6]);
    expect(pieceCells(spawnPiece('O')).map(([x]) => x)).toEqual([4, 5, 4, 5]);
  });
});

describe('movePiece and rotatePiece', () => {
  it('moves by the given offset without touching the input', () => {
    const piece = spawnPiece('T');
    const moved = movePiece(piece, -1, 2);

    expect(moved).toEqual({ ...piece, x: piece.x - 1, y: piece.y + 2 });
    expect(piece).toEqual(spawnPiece('T'));
  });

  it('rotates clockwise through the 4 states and back', () => {
    const piece = spawnPiece('L');
    const rotations = [1, 2, 3].reduce((acc) => [...acc, rotatePiece(acc[acc.length - 1])], [rotatePiece(piece)]);

    expect(rotations.map(({ rotation }) => rotation)).toEqual([1, 2, 3, 0]);
    expect(rotations[3]).toEqual(piece);
  });

  it('turns the I piece into a column', () => {
    const cells = pieceCells(rotatePiece(spawnPiece('I')));

    expect(new Set(cells.map(([x]) => x)).size).toBe(1);
    expect(cells.map(([, y]) => y)).toEqual([-1, 0, 1, 2]);
  });
});

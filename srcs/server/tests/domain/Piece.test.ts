import { describe, expect, it } from 'vitest';
import { pieceCells, spawnPiece } from '../../../shared/game/pieces.ts';
import { Piece } from '../../src/domain/Piece.ts';

describe('Piece', () => {
  const active = spawnPiece('T');

  it('keeps type, rotation and position', () => {
    expect(new Piece(active)).toMatchObject(active);
  });

  it('gives its cells on the board', () => {
    expect(new Piece(active).cells()).toEqual(pieceCells(active));
  });

  it('serializes to a plain active piece', () => {
    expect(JSON.parse(JSON.stringify(new Piece(active)))).toEqual(active);
    expect(new Piece(active).toJSON()).not.toBeInstanceOf(Piece);
  });
});

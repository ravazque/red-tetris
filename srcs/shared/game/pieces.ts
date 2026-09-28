import { BOARD_WIDTH } from '../constants.ts';
import type { ActivePiece, PieceType, Rotation } from './types.ts';

export type Offset = readonly [x: number, y: number];

// SRS rotation states (spawn, right, 180, left) as offsets inside the piece box; no wall kicks.
export const PIECE_SHAPES: Readonly<Record<PieceType, readonly (readonly Offset[])[]>> = {
  I: [
    [[0, 1], [1, 1], [2, 1], [3, 1]],
    [[2, 0], [2, 1], [2, 2], [2, 3]],
    [[0, 2], [1, 2], [2, 2], [3, 2]],
    [[1, 0], [1, 1], [1, 2], [1, 3]],
  ],
  O: [
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [2, 1]],
  ],
  T: [
    [[1, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [1, 2]],
    [[1, 0], [0, 1], [1, 1], [1, 2]],
  ],
  S: [
    [[1, 0], [2, 0], [0, 1], [1, 1]],
    [[1, 0], [1, 1], [2, 1], [2, 2]],
    [[1, 1], [2, 1], [0, 2], [1, 2]],
    [[0, 0], [0, 1], [1, 1], [1, 2]],
  ],
  Z: [
    [[0, 0], [1, 0], [1, 1], [2, 1]],
    [[2, 0], [1, 1], [2, 1], [1, 2]],
    [[0, 1], [1, 1], [1, 2], [2, 2]],
    [[1, 0], [0, 1], [1, 1], [0, 2]],
  ],
  J: [
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [2, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 1], [2, 1], [2, 2]],
    [[1, 0], [1, 1], [0, 2], [1, 2]],
  ],
  L: [
    [[2, 0], [0, 1], [1, 1], [2, 1]],
    [[1, 0], [1, 1], [1, 2], [2, 2]],
    [[0, 1], [1, 1], [2, 1], [0, 2]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
  ],
};

export const PIECE_TYPES = Object.keys(PIECE_SHAPES) as readonly PieceType[];

const SPAWN_X = Math.floor((BOARD_WIDTH - 4) / 2);

export const pieceCells = ({ type, rotation, x, y }: ActivePiece): readonly Offset[] =>
  PIECE_SHAPES[type][rotation].map(([dx, dy]) => [x + dx, y + dy] as const);

export const movePiece = (piece: ActivePiece, dx: number, dy: number): ActivePiece => ({
  ...piece,
  x: piece.x + dx,
  y: piece.y + dy,
});

export const rotatePiece = (piece: ActivePiece): ActivePiece => ({
  ...piece,
  rotation: ((piece.rotation + 1) % 4) as Rotation,
});

export const spawnPiece = (type: PieceType): ActivePiece => ({
  type,
  rotation: 0,
  x: SPAWN_X,
  y: -Math.min(...PIECE_SHAPES[type][0].map(([, dy]) => dy)),
});

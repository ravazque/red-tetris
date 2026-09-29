import { BOARD_HEIGHT, BOARD_WIDTH } from '../constants.ts';
import { pieceCells } from './pieces.ts';
import type { ActivePiece, Board, Cell } from './types.ts';

export const createBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));

// Copy of the board with the piece drawn in; cells outside the board are dropped.
export const mergePiece = (board: Board, piece: ActivePiece): Board => {
  const cells = pieceCells(piece);
  return board.map((row, y) =>
    row.map((cell, x) => (cells.some(([cx, cy]) => cx === x && cy === y) ? piece.type : cell)),
  );
};

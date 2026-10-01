import { BOARD_HEIGHT, BOARD_WIDTH } from '../constants.ts';
import { movePiece, pieceCells, spawnPiece } from './pieces.ts';
import type { ActivePiece, Board, Cell, PieceType } from './types.ts';

const emptyRows = (count: number): Cell[][] =>
  Array.from({ length: count }, () => Array<Cell>(BOARD_WIDTH).fill(null));

export const createBoard = (): Board => emptyRows(BOARD_HEIGHT);

// Copy of the board with the piece drawn in; cells outside the board are dropped.
export const mergePiece = (board: Board, piece: ActivePiece): Board => {
  const cells = pieceCells(piece);
  return board.map((row, y) =>
    row.map((cell, x) => (cells.some(([cx, cy]) => cx === x && cy === y) ? piece.type : cell)),
  );
};

// Cells above the top (y < 0) are free, so pieces can rotate or be pushed up there; they top out if they lock there.
export const collides = (board: Board, piece: ActivePiece) =>
  pieceCells(piece).some(
    ([x, y]) => x < 0 || x >= BOARD_WIDTH || y >= BOARD_HEIGHT || (y >= 0 && board[y][x] !== null),
  );

export const canSpawn = (board: Board, type: PieceType) => !collides(board, spawnPiece(type));

export const dropPosition = (board: Board, piece: ActivePiece): ActivePiece => {
  let dropped = piece;
  while (!collides(board, movePiece(dropped, 0, 1))) dropped = movePiece(dropped, 0, 1);
  return dropped;
};

// Penalty rows are never cleared.
export const clearLines = (board: Board): { readonly board: Board; readonly cleared: number } => {
  const kept = board.filter((row) => row.some((cell) => cell === null || cell === 'penalty'));
  const cleared = board.length - kept.length;
  return { board: [...emptyRows(cleared), ...kept], cleared };
};

// Pushes the stack up; overflow means blocks were pushed above the top.
export const addPenaltyLines = (board: Board, count: number): { readonly board: Board; readonly overflow: boolean } => {
  const lines = Math.min(Math.max(count, 0), BOARD_HEIGHT);
  const overflow = board.slice(0, lines).some((row) => row.some((cell) => cell !== null));
  const penalty = Array.from({ length: lines }, () => Array<Cell>(BOARD_WIDTH).fill('penalty'));
  return { board: [...board.slice(lines), ...penalty], overflow };
};

// Height of each column's highest block.
export const spectrum = (board: Board): number[] =>
  Array.from({ length: BOARD_WIDTH }, (_, x) => {
    const top = board.findIndex((row) => row[x] !== null);
    return top === -1 ? 0 : BOARD_HEIGHT - top;
  });

import type { GameAction } from '../constants.ts';
import { addPenaltyLines, clearLines, collides, createBoard, dropPosition, mergePiece } from './board.ts';
import { movePiece, pieceCells, rotatePiece, spawnPiece } from './pieces.ts';
import { PLACE_POINTS, clearPoints } from './scoring.ts';
import { pieceAt } from './sequence.ts';
import type { ActivePiece, Board, PieceType } from './types.ts';

// One player's round: a resting piece locks on the next tick, a hard drop locks at once; pieceIndex points to the next piece of the room sequence.
export interface GameState {
  readonly seed: number;
  readonly board: Board;
  readonly active: ActivePiece | null;
  readonly pieceIndex: number;
  readonly isAlive: boolean;
  readonly score: number;
  readonly lines: number;
}

export interface GameStep {
  readonly state: GameState;
  readonly cleared: number;
}

const topOut = (state: GameState, board: Board = state.board): GameState => ({ ...state, board, active: null, isAlive: false });

const spawnNext = (state: GameState): GameState => {
  const piece = spawnPiece(pieceAt(state.seed, state.pieceIndex));
  return collides(state.board, piece) ? topOut(state) : { ...state, active: piece, pieceIndex: state.pieceIndex + 1 };
};

export const createGameState = (seed: number): GameState =>
  spawnNext({ seed, board: createBoard(), active: null, pieceIndex: 0, isAlive: true, score: 0, lines: 0 });

export const nextPiece = (state: GameState): PieceType | null =>
  state.isAlive ? pieceAt(state.seed, state.pieceIndex) : null;

const unchanged = (state: GameState): GameStep => ({ state, cleared: 0 });

const lock = (state: GameState, piece: ActivePiece): GameStep => {
  const merged = mergePiece(state.board, piece);
  if (pieceCells(piece).some(([, y]) => y < 0)) return unchanged(topOut(state, merged));
  const { board, cleared } = clearLines(merged);
  const locked = { ...state, board, score: state.score + PLACE_POINTS + clearPoints(cleared), lines: state.lines + cleared };
  return { state: spawnNext(locked), cleared };
};

const shift = (state: GameState, piece: ActivePiece): GameStep =>
  collides(state.board, piece) ? unchanged(state) : unchanged({ ...state, active: piece });

export const tick = (state: GameState): GameStep => {
  if (!state.active) return unchanged(state);
  const below = movePiece(state.active, 0, 1);
  return collides(state.board, below) ? lock(state, state.active) : unchanged({ ...state, active: below });
};

export const applyAction = (state: GameState, action: GameAction): GameStep => {
  const { active } = state;
  if (!active) return unchanged(state);
  switch (action) {
    case 'move_left':
      return shift(state, movePiece(active, -1, 0));
    case 'move_right':
      return shift(state, movePiece(active, 1, 0));
    case 'rotate':
      return shift(state, rotatePiece(active));
    case 'soft_drop':
      return shift(state, movePiece(active, 0, 1));
    case 'hard_drop':
      return lock(state, dropPosition(state.board, active));
  }
};

export const eliminate = (state: GameState): GameState => (state.isAlive ? topOut(state) : state);

export const addPenalty = (state: GameState, lines: number): GameState => {
  if (!state.isAlive || lines <= 0) return state;
  const { board, overflow } = addPenaltyLines(state.board, lines);
  if (overflow) return topOut(state, board);
  let piece = state.active;
  while (piece && collides(board, piece)) piece = movePiece(piece, 0, -1);
  return { ...state, board, active: piece };
};

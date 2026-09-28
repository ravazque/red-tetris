import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import type { Board, Cell } from '../../../shared/game/types.ts';

// Pure board operations: create, merge piece, clear lines, penalty lines, spectrum.
export const createBoard = (): Board =>
  Array.from({ length: BOARD_HEIGHT }, () => Array<Cell>(BOARD_WIDTH).fill(null));

import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import type { Board, Cell } from '../../../shared/game/types.ts';

const toCell = (char: string): Cell => (char === '.' ? null : char === '#' ? 'penalty' : (char as Cell));

// Bottom rows of a board ('.' empty, '#' penalty, letters = pieces); missing rows on top are empty.
export const fromRows = (rows: readonly string[]): Board => [
  ...Array.from({ length: BOARD_HEIGHT - rows.length }, () => Array<Cell>(BOARD_WIDTH).fill(null)),
  ...rows.map((row) => [...row].map(toCell)),
];

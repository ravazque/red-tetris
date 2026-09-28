import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import { createBoard } from '../../src/game/board.ts';
import { fromRows } from '../helpers/board.ts';

describe('createBoard', () => {
  it('returns BOARD_HEIGHT empty rows of BOARD_WIDTH cells', () => {
    const board = createBoard();

    expect(board).toHaveLength(BOARD_HEIGHT);
    expect(board.every((row) => row.length === BOARD_WIDTH && row.every((cell) => cell === null))).toBe(true);
  });

  it('returns independent rows', () => {
    const [first, second] = createBoard();

    expect(first).not.toBe(second);
  });
});

describe('fromRows', () => {
  it('pads missing top rows and maps symbols to cells', () => {
    const board = fromRows(['T........#']);

    expect(board).toHaveLength(BOARD_HEIGHT);
    expect(board[0]).toEqual(createBoard()[0]);
    expect(board[BOARD_HEIGHT - 1]).toEqual(['T', null, null, null, null, null, null, null, null, 'penalty']);
  });
});

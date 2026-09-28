import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../../shared/constants.ts';
import { createBoard, mergePiece } from '../../../../shared/game/board.ts';
import { spawnPiece } from '../../../../shared/game/pieces.ts';
import { fromRows } from '../../helpers/board.ts';

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

describe('mergePiece', () => {
  it('draws the piece cells with its type and keeps the rest', () => {
    const board = fromRows(['#.........']);
    const merged = mergePiece(board, spawnPiece('T'));

    expect(merged[0]).toEqual([null, null, null, null, 'T', null, null, null, null, null]);
    expect(merged[1]).toEqual([null, null, null, 'T', 'T', 'T', null, null, null, null]);
    expect(merged[BOARD_HEIGHT - 1]).toEqual(board[BOARD_HEIGHT - 1]);
  });

  it('never changes the input board', () => {
    const board = createBoard();

    mergePiece(board, spawnPiece('O'));

    expect(board).toEqual(createBoard());
  });

  it('drops cells above the board', () => {
    const merged = mergePiece(createBoard(), { type: 'I', rotation: 1, x: 0, y: -2 });

    expect(merged.flat().filter((cell) => cell === 'I')).toHaveLength(2);
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

import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../../shared/constants.ts';
import {
  addPenaltyLines,
  canSpawn,
  clearLines,
  collides,
  createBoard,
  dropPosition,
  mergePiece,
  spectrum,
} from '../../../../shared/game/board.ts';
import { movePiece, spawnPiece } from '../../../../shared/game/pieces.ts';
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

describe('collides', () => {
  it('stops at the walls and the floor', () => {
    const board = createBoard();
    const piece = spawnPiece('T');

    expect(collides(board, piece)).toBe(false);
    expect(collides(board, movePiece(piece, -3, 0))).toBe(false);
    expect(collides(board, movePiece(piece, -4, 0))).toBe(true);
    expect(collides(board, movePiece(piece, 4, 0))).toBe(false);
    expect(collides(board, movePiece(piece, 5, 0))).toBe(true);
    expect(collides(board, movePiece(piece, 0, 18))).toBe(false);
    expect(collides(board, movePiece(piece, 0, 19))).toBe(true);
  });

  it('hits settled blocks and penalty rows', () => {
    const piece = movePiece(spawnPiece('T'), 0, 18);

    expect(collides(fromRows(['#########.']), piece)).toBe(true);
    expect(collides(fromRows(['I.........']), piece)).toBe(false);
  });

  it('lets pieces stick out above the top', () => {
    expect(collides(createBoard(), { type: 'I', rotation: 1, x: 0, y: -2 })).toBe(false);
  });
});

describe('canSpawn', () => {
  it('is false once the spawn cells are taken', () => {
    expect(canSpawn(createBoard(), 'T')).toBe(true);
    expect(canSpawn(mergePiece(createBoard(), spawnPiece('O')), 'T')).toBe(false);
  });
});

describe('dropPosition', () => {
  it('moves the piece down until it rests', () => {
    expect(dropPosition(createBoard(), spawnPiece('T')).y).toBe(18);
    expect(dropPosition(fromRows(['TTTTTTTTT.']), spawnPiece('T')).y).toBe(17);
  });

  it('keeps a resting piece where it is', () => {
    const resting = movePiece(spawnPiece('O'), 0, 18);

    expect(dropPosition(createBoard(), resting)).toEqual(resting);
  });
});

describe('clearLines', () => {
  it.each([
    [0, ['IIIIIIIII.', 'T.........']],
    [1, ['T.........', 'IIIIIIIIII']],
    [2, ['IIIIIIIIII', 'T.........', 'LLLLLLLLLL']],
    [4, ['IIIIIIIIII', 'JJJJJJJJJJ', 'LLLLLLLLLL', 'OOOOOOOOOO']],
  ])('clears %i full rows and moves the rest down', (cleared, rows) => {
    const result = clearLines(fromRows(rows));
    const kept = rows.filter((row) => row.includes('.'));

    expect(result.cleared).toBe(cleared);
    expect(result.board).toEqual(fromRows(kept));
  });

  it('never clears penalty rows', () => {
    const result = clearLines(fromRows(['IIIIIIIIII', '##########']));

    expect(result.cleared).toBe(1);
    expect(result.board).toEqual(fromRows(['##########']));
  });
});

describe('addPenaltyLines', () => {
  it('pushes the stack up and adds full penalty rows at the bottom', () => {
    const result = addPenaltyLines(fromRows(['T.........']), 2);

    expect(result.overflow).toBe(false);
    expect(result.board).toEqual(fromRows(['T.........', '##########', '##########']));
  });

  it('overflows when blocks are pushed above the top', () => {
    const board = fromRows(Array.from({ length: BOARD_HEIGHT }, () => 'T.........'));

    expect(addPenaltyLines(board, 1).overflow).toBe(true);
    expect(addPenaltyLines(fromRows(['T.........']), BOARD_HEIGHT - 1).overflow).toBe(false);
  });

  it('ignores zero lines and caps the count at the board height', () => {
    const board = fromRows(['T.........']);

    expect(addPenaltyLines(board, 0)).toEqual({ board, overflow: false });
    expect(addPenaltyLines(board, BOARD_HEIGHT + 5).board).toEqual(
      fromRows(Array.from({ length: BOARD_HEIGHT }, () => '##########')),
    );
  });
});

describe('spectrum', () => {
  it('gives the height of the highest block of each column', () => {
    expect(spectrum(createBoard())).toEqual(Array(BOARD_WIDTH).fill(0));
    expect(spectrum(fromRows(['T.........', 'I...#....#']))).toEqual([2, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  });
});

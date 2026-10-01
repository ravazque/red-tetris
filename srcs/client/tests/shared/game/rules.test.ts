import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../../shared/constants.ts';
import { createBoard, mergePiece } from '../../../../shared/game/board.ts';
import { movePiece, spawnPiece } from '../../../../shared/game/pieces.ts';
import {
  addPenalty,
  applyAction,
  createGameState,
  eliminate,
  nextPiece,
  tick,
  type GameState,
} from '../../../../shared/game/rules.ts';
import { pieceAt } from '../../../../shared/game/sequence.ts';
import type { ActivePiece, Board, Cell } from '../../../../shared/game/types.ts';
import { fromRows } from '../../helpers/board.ts';

const SEED = 7;

const stateOf = (board: Board, active: ActivePiece | null, extra: Partial<GameState> = {}): GameState => ({
  seed: SEED,
  board,
  active,
  pieceIndex: 1,
  isAlive: true,
  score: 0,
  lines: 0,
  ...extra,
});

const dead = stateOf(createBoard(), null, { isAlive: false });

describe('createGameState', () => {
  it('spawns the first piece of the seeded sequence', () => {
    const state = createGameState(SEED);

    expect(state).toMatchObject({ seed: SEED, active: spawnPiece(pieceAt(SEED, 0)), pieceIndex: 1, isAlive: true, score: 0, lines: 0 });
    expect(state.board).toEqual(createBoard());
    expect(nextPiece(state)).toBe(pieceAt(SEED, 1));
  });

  it('has no next piece once the player is out', () => {
    expect(nextPiece(dead)).toBeNull();
  });
});

describe('tick', () => {
  it('moves the piece one row down', () => {
    const state = stateOf(createBoard(), spawnPiece('T'));

    expect(tick(state)).toEqual({ state: { ...state, active: movePiece(spawnPiece('T'), 0, 1) }, cleared: 0 });
  });

  it('locks a piece on the tick after it touches the pile', () => {
    const touching = tick(stateOf(createBoard(), movePiece(spawnPiece('T'), 0, 17))).state;
    expect(touching.active?.y).toBe(18);
    expect(touching.board).toEqual(createBoard());

    const locked = tick(touching).state;
    expect(locked.board).toEqual(fromRows(['....T.....', '...TTT....']));
    expect(locked.active).toEqual(spawnPiece(pieceAt(SEED, 1)));
    expect(locked.pieceIndex).toBe(2);
  });

  it.each([
    [1, 110, ['IIIIII....'], { type: 'I', rotation: 0, x: 6, y: 18 }],
    [2, 310, ['OOOOOOOO..', 'OOOOOOOO..'], { type: 'O', rotation: 0, x: 7, y: 18 }],
  ] as const)('clears %i line(s) on lock and adds %i points (the lines plus 10 for the piece)', (cleared, points, rows, piece) => {
    const step = tick(stateOf(fromRows(rows), piece, { score: 5, lines: 3 }));

    expect(step.cleared).toBe(cleared);
    expect(step.state.board).toEqual(createBoard());
    expect(step.state).toMatchObject({ score: 5 + points, lines: 3 + cleared, isAlive: true });
  });

  it('tops out when a piece locks above the top', () => {
    const column = fromRows(Array.from({ length: BOARD_HEIGHT - 1 }, () => 'L.........'));
    const state = tick(stateOf(column, { type: 'I', rotation: 1, x: -2, y: -3 })).state;

    expect(state).toMatchObject({ isAlive: false, active: null });
    expect(state.board[0][0]).toBe('I');
  });

  it('tops out when the next piece can not spawn', () => {
    const blocked = createBoard().map((row, y) => row.map((cell, x): Cell => (y < 2 && x < BOARD_WIDTH - 1 ? 'L' : cell)));
    const state = tick(stateOf(blocked, { type: 'O', rotation: 0, x: -1, y: 18 })).state;

    expect(state).toMatchObject({ isAlive: false, active: null });
    expect(nextPiece(state)).toBeNull();
  });

  it('does nothing once the player is out', () => {
    expect(tick(dead).state).toBe(dead);
  });
});

describe('applyAction', () => {
  const t = spawnPiece('T');

  it.each([
    ['move_left', movePiece(t, -1, 0)],
    ['move_right', movePiece(t, 1, 0)],
    ['rotate', { ...t, rotation: 1 }],
    ['soft_drop', movePiece(t, 0, 1)],
  ] as const)('%s moves the piece and pays nothing', (action, active) => {
    expect(applyAction(stateOf(createBoard(), t), action)).toEqual({ state: stateOf(createBoard(), active), cleared: 0 });
  });

  it.each([
    ['move_left', movePiece(t, -3, 0)],
    ['move_right', movePiece(t, 4, 0)],
    ['rotate', { type: 'I', rotation: 1, x: -2, y: 5 }],
    ['soft_drop', movePiece(t, 0, 18)],
  ] as const)('%s is blocked without changing the state', (action, active) => {
    const state = stateOf(createBoard(), active);

    expect(applyAction(state, action)).toEqual({ state, cleared: 0 });
    expect(applyAction(state, action).state).toBe(state);
  });

  it('hard_drop locks at once, pays only the placed piece and spawns the next piece', () => {
    const step = applyAction(stateOf(createBoard(), t), 'hard_drop');

    expect(step.state.board).toEqual(mergePiece(createBoard(), movePiece(t, 0, 18)));
    expect(step.state).toMatchObject({ score: 10, active: spawnPiece(pieceAt(SEED, 1)), pieceIndex: 2 });
  });

  it('hard_drop into a well clears 4 lines', () => {
    const well = fromRows(Array.from({ length: 4 }, () => 'IIIIIIIII.'));
    const step = applyAction(stateOf(well, { type: 'I', rotation: 1, x: 7, y: 0 }), 'hard_drop');

    expect(step.cleared).toBe(4);
    expect(step.state).toMatchObject({ board: createBoard(), score: 800 + 10, lines: 4 });
  });

  it('ignores actions once the player is out', () => {
    expect(applyAction(dead, 'hard_drop').state).toBe(dead);
  });
});

describe('addPenalty', () => {
  it('adds penalty rows and keeps a free piece in place', () => {
    const state = addPenalty(stateOf(fromRows(['T.........']), spawnPiece('O')), 2);

    expect(state.board).toEqual(fromRows(['T.........', '##########', '##########']));
    expect(state.active).toEqual(spawnPiece('O'));
  });

  it('lifts a piece the new rows would overlap', () => {
    const state = addPenalty(stateOf(createBoard(), movePiece(spawnPiece('T'), 0, 18)), 2);

    expect(state.active?.y).toBe(16);
    expect(state.isAlive).toBe(true);
  });

  it('tops out when blocks are pushed above the top', () => {
    const full = fromRows(Array.from({ length: BOARD_HEIGHT }, () => '#########.'));

    expect(addPenalty(stateOf(full, spawnPiece('T')), 1)).toMatchObject({ isAlive: false, active: null });
  });

  it('ignores zero lines and players who are out', () => {
    const state = stateOf(createBoard(), spawnPiece('T'));

    expect(addPenalty(state, 0)).toBe(state);
    expect(addPenalty(dead, 3)).toBe(dead);
  });
});

describe('eliminate', () => {
  it('takes the player out and drops the active piece', () => {
    const state = stateOf(fromRows(['T.........']), spawnPiece('T'));

    expect(eliminate(state)).toEqual({ ...state, active: null, isAlive: false });
    expect(eliminate(dead)).toBe(dead);
  });
});

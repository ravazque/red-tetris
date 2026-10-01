import { describe, expect, it } from 'vitest';
import { createBoard } from '../../../shared/game/board.ts';
import {
  gameStarted,
  gameStateReceived,
  joinRequested,
  leaveRequested,
  spectrumReceived,
} from '../../src/app/actions.ts';
import { boardOf, gameReducer, ghostOf, penaltyRows } from '../../src/game/reducer.ts';
import { snapshotOf } from '../helpers/room.ts';

const snapshot = snapshotOf(['ZZ........'], { active: { type: 'O', rotation: 0, x: 3, y: 0 } });
const received = (revision: number) =>
  gameReducer(undefined, gameStateReceived({ roomId: 'room1', revision, playerId: 'p1', state: snapshot }));

describe('gameReducer', () => {
  it('stores each player snapshot and spectrum', () => {
    const state = gameReducer(
      received(3),
      spectrumReceived({ roomId: 'room1', revision: 3, playerId: 'p2', spectrum: [1, 2, 0, 0, 0, 0, 0, 0, 0, 0] }),
    );

    expect(state.players.p1).toEqual(snapshot);
    expect(state.spectrums.p2).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(state.revision).toBe(3);
  });

  it('drops stale snapshots and spectrums', () => {
    const state = received(3);

    expect(gameReducer(state, gameStateReceived({ roomId: 'room1', revision: 2, playerId: 'p2', state: snapshot }))).toBe(state);
    expect(gameReducer(state, spectrumReceived({ roomId: 'room1', revision: 1, playerId: 'p2', spectrum: [] }))).toBe(state);
  });

  it('starts over on join, leave and game start', () => {
    const empty = gameReducer(undefined, { type: 'unknown' });

    expect(gameReducer(received(3), joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'versus' }))).toEqual(empty);
    expect(gameReducer(received(3), leaveRequested({ roomId: 'room1' }))).toEqual(empty);
    expect(gameReducer(received(3), gameStarted({ roomId: 'room1', revision: 5, phase: 'running', playerIds: [] }))).toEqual({
      ...empty,
      revision: 5,
    });
  });
});

describe('boardOf', () => {
  it('is empty without a snapshot', () => {
    expect(boardOf(undefined)).toEqual(createBoard());
  });

  it('draws the active piece over the settled cells', () => {
    const board = boardOf(snapshot);

    expect(board[0]?.slice(3, 7)).toEqual([null, 'O', 'O', null]);
    expect(board[19]?.slice(0, 2)).toEqual(['Z', 'Z']);
    expect(boardOf({ ...snapshot, active: null })).toBe(snapshot.board);
  });

  it('counts line clears and incoming penalty rows per player, from the second snapshot on', () => {
    const state = (rows: readonly string[], lines: number) => snapshotOf(rows, { lines });
    const apply = (current: ReturnType<typeof gameReducer>, playerId: string, next: ReturnType<typeof state>) =>
      gameReducer(current, gameStateReceived({ roomId: 'room1', revision: 1, playerId, state: next }));

    let current = apply(gameReducer(undefined, { type: 'unknown' }), 'p1', state(['##########'], 3));
    expect(current.effects.p1).toEqual({ clears: 0, penalties: 0 });

    current = apply(current, 'p1', state(['##########'], 4));
    current = apply(current, 'p1', state(['##########', '##########'], 4));
    current = apply(current, 'p1', state(['T.........', '##########', '##########'], 4));
    current = apply(current, 'p2', state([], 1));

    expect(current.effects).toEqual({ p1: { clears: 1, penalties: 1 }, p2: { clears: 0, penalties: 0 } });
    expect(gameReducer(current, gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1'] })).effects).toEqual({});
  });
});

describe('ghostOf', () => {
  it('drops the active piece to where it would land', () => {
    expect(ghostOf(snapshot)).toEqual({ type: 'O', rotation: 0, x: 3, y: 18 });
    expect(ghostOf(snapshotOf([]))).toBeNull();
    expect(ghostOf(undefined)).toBeNull();
  });
});

describe('penaltyRows', () => {
  it('counts full penalty rows only', () => {
    expect(penaltyRows(snapshotOf(['#########.', '##########', '##########']).board)).toBe(2);
  });
});

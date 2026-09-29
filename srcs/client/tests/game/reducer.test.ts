import { describe, expect, it } from 'vitest';
import { createBoard } from '../../../shared/game/board.ts';
import {
  gameStarted,
  gameStateReceived,
  joinRequested,
  leaveRequested,
  spectrumReceived,
} from '../../src/app/actions.ts';
import { boardOf, gameReducer } from '../../src/game/reducer.ts';
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
});

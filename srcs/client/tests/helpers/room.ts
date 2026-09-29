import type { GameSnapshot } from '../../../shared/game/types.ts';
import type { RoomPlayerSummary } from '../../../shared/types.ts';
import type { RoomState } from '../../src/room/reducer.ts';
import { fromRows } from './board.ts';

export const ALICE: RoomPlayerSummary = { playerId: 'p1', name: 'alice', isAlive: true };
export const BOBBY: RoomPlayerSummary = { playerId: 'p2', name: 'bobby', isAlive: true };

// Room slice fixture: versus room1 waiting, alice (p1) host, bobby (p2) the local player unless overridden.
export const roomOf = (overrides: Partial<RoomState> = {}): RoomState => ({
  roomId: 'room1',
  phase: 'waiting',
  mode: 'versus',
  selfPlayerId: 'p2',
  hostPlayerId: 'p1',
  players: [ALICE, BOBBY],
  winnerPlayerId: null,
  finishReason: null,
  pause: null,
  revision: 2,
  error: null,
  ...overrides,
});

export const snapshotOf = (rows: readonly string[], overrides: Partial<GameSnapshot> = {}): GameSnapshot => ({
  board: fromRows(rows),
  active: null,
  next: null,
  isAlive: true,
  lastSequence: 0,
  ...overrides,
});

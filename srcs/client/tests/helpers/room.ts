import type { GameSnapshot } from '../../../shared/game/types.ts';
import type { RoomPlayerSummary } from '../../../shared/types.ts';
import type { RoomState } from '../../src/room/reducer.ts';
import { fromRows } from './board.ts';

export const ALICE: RoomPlayerSummary = { playerId: 'p1', name: 'alice', isAlive: true, isReady: false, isConnected: true };
export const BOBBY: RoomPlayerSummary = { playerId: 'p2', name: 'bobby', isAlive: true, isReady: false, isConnected: true };

// Room slice fixture: versus room1 waiting, alice (p1) host, bobby (p2) the local player unless overridden.
export const roomOf = (overrides: Partial<RoomState> = {}): RoomState => ({
  roomId: 'room1',
  phase: 'waiting',
  mode: 'versus',
  rule: 'survival',
  selfPlayerId: 'p2',
  hostPlayerId: 'p1',
  players: [ALICE, BOBBY],
  winnerPlayerId: null,
  finishReason: null,
  pause: null,
  revision: 2,
  error: null,
  closed: null,
  ...overrides,
});

export const snapshotOf = (rows: readonly string[], overrides: Partial<GameSnapshot> = {}): GameSnapshot => ({
  board: fromRows(rows),
  active: null,
  next: null,
  isAlive: true,
  lastSequence: 0,
  score: 0,
  lines: 0,
  ...overrides,
});

import { afterEach, describe, expect, it, vi } from 'vitest';
import { BOARD_HEIGHT } from '../../../shared/constants.ts';
import type { GameAction } from '../../../shared/constants.ts';
import { spawnPiece } from '../../../shared/game/pieces.ts';
import { pieceAt } from '../../../shared/game/sequence.ts';
import { Game, GameError, createGame, type GameEvent } from '../../src/domain/Game.ts';
import { Player } from '../../src/domain/Player.ts';

const SEED = 21;
const solo = () => new Game({ roomId: 'room-1', playerIds: ['alice'], seed: SEED });
const duel = () => new Game({ roomId: 'room-1', playerIds: ['alice', 'bobby'], seed: SEED });
const scoreDuel = () => new Game({ roomId: 'room-1', playerIds: ['alice', 'bobby'], seed: SEED, rule: 'score' });

const ofType = <T extends GameEvent['type']>(events: readonly GameEvent[], type: T) =>
  events.filter((event): event is Extract<GameEvent, { type: T }> => event.type === type);

const catchError = (operation: () => unknown) => {
  try {
    operation();
  } catch (error) {
    return error;
  }
  return null;
};

// Hard drops until the player tops out; returns every event on the way.
const dropUntilOut = (game: Game, playerId: string) => {
  const events: GameEvent[] = [];
  for (let sequence = 1; game.snapshot(playerId).isAlive && sequence < 200; sequence += 1) {
    events.push(...game.applyInput(playerId, 'hard_drop', sequence));
  }
  return events;
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Game', () => {
  it('seats every player on the same piece sequence', () => {
    const game = duel();

    expect(game.roomId).toBe('room-1');
    expect(game.playerIds).toEqual(['alice', 'bobby']);
    for (const playerId of game.playerIds) {
      expect(game.snapshot(playerId)).toMatchObject({ active: spawnPiece(pieceAt(SEED, 0)), next: pieceAt(SEED, 1), isAlive: true });
    }
    expect(game.spectrum('alice')).toEqual(Array(10).fill(0));
  });

  it('draws a random seed when none is given', () => {
    const game = createGame({ roomId: 'room-1', playerIds: ['alice'] });

    expect(game).toBeInstanceOf(Game);
    expect(Number.isInteger(game.seed)).toBe(true);
  });

  it('applies an input and returns the new snapshot', () => {
    const game = duel();

    const events = game.applyInput('alice', 'soft_drop', 1);

    expect(events).toEqual([{ type: 'state', playerId: 'alice', state: game.snapshot('alice') }]);
    expect(game.snapshot('alice')).toMatchObject({ lastSequence: 1, score: 0 });
    expect(game.snapshot('bobby')).toMatchObject({ lastSequence: 0, score: 0 });
  });

  it('ignores stale sequences and blocked moves', () => {
    const game = solo();
    game.applyInput('alice', 'soft_drop', 5);

    expect(game.applyInput('alice', 'soft_drop', 5)).toEqual([]);
    expect(game.applyInput('alice', 'soft_drop', 3)).toEqual([]);
    for (let sequence = 6; sequence < 12; sequence += 1) game.applyInput('alice', 'move_left', sequence);
    expect(game.applyInput('alice', 'move_left', 12)).toEqual([]);
    expect(game.snapshot('alice').lastSequence).toBe(12);
  });

  it('rejects unknown players, actions and sequences', () => {
    const game = solo();

    expect(catchError(() => game.applyInput('carol', 'rotate', 1))).toMatchObject({ code: 'INVALID_PLAYER' });
    expect(catchError(() => game.applyInput('alice', 'spin' as GameAction, 1))).toMatchObject({ code: 'INVALID_ACTION' });
    expect(catchError(() => game.applyInput('alice', 'rotate', 1.5))).toMatchObject({ code: 'INVALID_PAYLOAD' });
    expect(catchError(() => game.applyInput('alice', 'rotate', -1))).toBeInstanceOf(GameError);
    expect(catchError(() => game.snapshot('carol'))).toBeInstanceOf(GameError);
  });

  it('moves every player down on tick', () => {
    const game = duel();

    const events = game.tick();

    expect(ofType(events, 'state').map(({ playerId }) => playerId)).toEqual(['alice', 'bobby']);
    expect(game.snapshot('alice').active?.y).toBe(spawnPiece(pieceAt(SEED, 0)).y + 1);
  });

  it('freezes ticks and inputs while paused', () => {
    const game = solo();
    game.pause();

    expect(game.isPaused).toBe(true);
    expect(game.tick()).toEqual([]);
    expect(game.applyInput('alice', 'rotate', 1)).toEqual([]);
    game.resume();
    expect(game.tick()).not.toEqual([]);
  });

  it('plays a solo round to the end: top-out without a winner', () => {
    const game = solo();

    const events = dropUntilOut(game, 'alice');

    expect(ofType(events, 'spectrum').length).toBeGreaterThan(0);
    expect(ofType(events, 'eliminated')).toEqual([{ type: 'eliminated', playerId: 'alice', reason: 'topout' }]);
    expect(events.at(-1)).toEqual({ type: 'finished', winnerPlayerId: null, reason: 'topout' });
    expect(game.isFinished).toBe(true);
    expect(game.winnerPlayerId).toBeNull();
    expect(game.tick()).toEqual([]);
    expect(game.applyInput('alice', 'rotate', 999)).toEqual([]);
  });

  it('survival: the last player standing wins', () => {
    const game = duel();
    game.applyInput('bobby', 'move_left', 1);

    const events = dropUntilOut(game, 'alice');

    expect(game.rule).toBe('survival');
    expect(events.at(-1)).toEqual({ type: 'finished', winnerPlayerId: 'bobby', reason: 'topout' });
    expect(game.applyInput('bobby', 'rotate', 2)).toEqual([]);
  });

  it('survival: players out in the same tick end in a draw', () => {
    const game = duel();
    const events: GameEvent[] = [];

    for (let step = 0; step < 2000 && !game.isFinished; step += 1) events.push(...game.tick());

    expect(events.at(-1)).toEqual({ type: 'finished', winnerPlayerId: null, reason: 'topout' });
  });

  it('survival: a rival pushed over the top by penalties loses at once', () => {
    const game = duel();
    game.applyInput('bobby', 'hard_drop', 1);

    expect(game.addPenalty('bobby', BOARD_HEIGHT, 'alice').at(-1)).toEqual({ type: 'finished', winnerPlayerId: 'alice', reason: 'topout' });
  });

  it('score: keeps a topped-out player waiting while the rival plays on, then the higher score wins', () => {
    const game = scoreDuel();

    const aliceOut = dropUntilOut(game, 'alice');
    expect(ofType(aliceOut, 'eliminated')).toEqual([{ type: 'eliminated', playerId: 'alice', reason: 'topout' }]);
    expect(ofType(aliceOut, 'finished')).toEqual([]);
    expect(game.isFinished).toBe(false);
    expect(game.applyInput('alice', 'rotate', 999)).toEqual([]);

    // Bobby spreads his pieces over the board, so he places more of them (10 points each) before topping out.
    const events: GameEvent[] = [];
    for (let sequence = 1; game.snapshot('bobby').isAlive && sequence < 2000; sequence += 6) {
      const side = (sequence % 4 < 2 ? 'move_left' : 'move_right') as GameAction;
      for (let step = 0; step < 5; step += 1) events.push(...game.applyInput('bobby', side, sequence + step));
      events.push(...game.applyInput('bobby', 'hard_drop', sequence + 5));
    }

    expect(game.snapshot('bobby').score).toBeGreaterThan(game.snapshot('alice').score);
    expect(events.at(-1)).toEqual({ type: 'finished', winnerPlayerId: 'bobby', reason: 'score' });
    expect(game.winnerPlayerId).toBe('bobby');
  });

  it('score: calls a draw when both players top out with the same score', () => {
    const game = scoreDuel();
    const events: GameEvent[] = [];

    for (let step = 0; step < 2000 && !game.isFinished; step += 1) events.push(...game.tick());

    expect(ofType(events, 'eliminated').map(({ playerId }) => playerId)).toEqual(['alice', 'bobby']);
    expect(events.at(-1)).toEqual({ type: 'finished', winnerPlayerId: null, reason: 'score' });
  });

  it('sends n - 1 penalty lines to each rival still in the round', () => {
    const game = duel();
    vi.spyOn(Player.prototype, 'apply').mockReturnValueOnce({ changed: true, settled: true, cleared: 3, eliminated: false });

    const events = game.applyInput('alice', 'hard_drop', 1);

    expect(ofType(events, 'penalty')).toEqual([{ type: 'penalty', sourcePlayerId: 'alice', targetPlayerId: 'bobby', lines: 2 }]);
    expect(ofType(events, 'spectrum').map(({ playerId }) => playerId)).toEqual(['alice', 'bobby']);
    expect(game.snapshot('bobby').board.slice(BOARD_HEIGHT - 2).flat().every((cell) => cell === 'penalty')).toBe(true);
  });

  it('sends no penalty for a single line', () => {
    const game = duel();
    vi.spyOn(Player.prototype, 'apply').mockReturnValueOnce({ changed: true, settled: true, cleared: 1, eliminated: false });

    expect(ofType(game.applyInput('alice', 'hard_drop', 1), 'penalty')).toEqual([]);
  });

  it('score: puts a rival out with penalties, but the round goes on while the other plays', () => {
    const game = scoreDuel();
    game.applyInput('bobby', 'hard_drop', 1);

    const events = game.addPenalty('bobby', BOARD_HEIGHT, 'alice');

    expect(ofType(events, 'penalty')).toEqual([{ type: 'penalty', sourcePlayerId: 'alice', targetPlayerId: 'bobby', lines: BOARD_HEIGHT }]);
    expect(ofType(events, 'eliminated')).toEqual([{ type: 'eliminated', playerId: 'bobby', reason: 'topout' }]);
    expect(game.isFinished).toBe(false);
    expect(dropUntilOut(game, 'alice').at(-1)).toMatchObject({ type: 'finished', reason: 'score' });
  });

  it('score: gives the win to the player who stayed when the other leaves after topping out', () => {
    const game = scoreDuel();
    dropUntilOut(game, 'alice');

    expect(game.removePlayer('alice').at(-1)).toEqual({ type: 'finished', winnerPlayerId: 'bobby', reason: 'left' });
  });

  it('ignores penalties while paused, after the end or with no lines', () => {
    const game = duel();

    expect(game.addPenalty('bobby', 0, 'alice')).toEqual([]);
    game.pause();
    expect(game.addPenalty('bobby', 1, 'alice')).toEqual([]);
    expect(catchError(() => game.addPenalty('bobby', 1, 'carol'))).toMatchObject({ code: 'INVALID_PLAYER' });
  });

  it('counts leaving as an elimination and ends the round', () => {
    const game = duel();

    const events = game.removePlayer('bobby');

    expect(events).toEqual([
      { type: 'state', playerId: 'bobby', state: game.snapshot('bobby') },
      { type: 'eliminated', playerId: 'bobby', reason: 'left' },
      { type: 'finished', winnerPlayerId: 'alice', reason: 'left' },
    ]);
    expect(game.removePlayer('alice')).toEqual([]);
  });

  it('ends on a reconnection timeout even while paused', () => {
    const game = duel();
    game.pause();

    expect(game.removePlayer('alice', 'timeout').at(-1)).toEqual({ type: 'finished', winnerPlayerId: 'bobby', reason: 'timeout' });
  });

  it('ignores a player who is already out', () => {
    const game = new Game({ roomId: 'room-1', playerIds: ['alice', 'bobby', 'carol'], seed: SEED });
    game.removePlayer('carol');

    expect(game.isFinished).toBe(false);
    expect(game.removePlayer('carol')).toEqual([]);
    expect(game.addPenalty('carol', 1, 'alice')).toEqual([]);
    expect(game.applyInput('carol', 'rotate', 1)).toEqual([]);
  });
});

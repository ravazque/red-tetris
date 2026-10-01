import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT } from '../../../shared/constants.ts';
import { createBoard } from '../../../shared/game/board.ts';
import { spawnPiece } from '../../../shared/game/pieces.ts';
import { pieceAt } from '../../../shared/game/sequence.ts';
import { Piece } from '../../src/domain/Piece.ts';
import { Player } from '../../src/domain/Player.ts';

const SEED = 11;

describe('Player', () => {
  it('starts alive with the first piece of the seeded sequence', () => {
    const player = new Player('player-1', SEED);

    expect(player.id).toBe('player-1');
    expect(player.isAlive).toBe(true);
    expect(player.piece).toBeInstanceOf(Piece);
    expect(player.snapshot()).toEqual({
      board: createBoard(),
      active: spawnPiece(pieceAt(SEED, 0)),
      next: pieceAt(SEED, 1),
      isAlive: true,
      lastSequence: 0,
      score: 0,
      lines: 0,
    });
  });

  it('applies an action and remembers its sequence', () => {
    const player = new Player('player-1', SEED);

    expect(player.apply('soft_drop', 4)).toEqual({ changed: true, settled: false, cleared: 0, eliminated: false });
    expect(player.snapshot()).toMatchObject({ lastSequence: 4, score: 0 });
  });

  it('reports a blocked action as no change', () => {
    const player = new Player('player-1', SEED);
    for (let step = 0; step < 6; step += 1) player.apply('move_left', step + 1);

    expect(player.apply('move_left', 7)).toMatchObject({ changed: false, settled: false });
    expect(player.lastSequence).toBe(7);
  });

  it('reports a lock as a settled board', () => {
    const player = new Player('player-1', SEED);

    expect(player.apply('hard_drop', 1)).toMatchObject({ changed: true, settled: true, cleared: 0 });
    expect(player.spectrum().some((height) => height > 0)).toBe(true);
  });

  it('moves down on tick', () => {
    const player = new Player('player-1', SEED);
    const y = player.piece?.y ?? 0;

    expect(player.tick()).toMatchObject({ changed: true, settled: false });
    expect(player.piece?.y).toBe(y + 1);
  });

  it('receives penalty lines at the bottom', () => {
    const player = new Player('player-1', SEED);

    expect(player.receivePenalty(2)).toMatchObject({ changed: true, settled: true });
    expect(player.board[BOARD_HEIGHT - 1].every((cell) => cell === 'penalty')).toBe(true);
    expect(player.spectrum()).toEqual(Array(10).fill(2));
  });

  it('is eliminated once, then has no piece', () => {
    const player = new Player('player-1', SEED);

    expect(player.eliminate()).toMatchObject({ changed: true, eliminated: true });
    expect(player.eliminate()).toMatchObject({ changed: false, eliminated: false });
    expect(player.piece).toBeNull();
    expect(player.snapshot()).toMatchObject({ isAlive: false, active: null, next: null });
  });
});

import type { GameAction } from '../../../shared/constants.ts';
import { spectrum } from '../../../shared/game/board.ts';
import {
  addPenalty,
  applyAction,
  createGameState,
  eliminate,
  nextPiece,
  tick,
  type GameState,
  type GameStep,
} from '../../../shared/game/rules.ts';
import type { Board, GameSnapshot } from '../../../shared/game/types.ts';
import { Piece } from './Piece.ts';

export interface PlayerChange {
  readonly changed: boolean;
  readonly settled: boolean;
  readonly cleared: number;
  readonly eliminated: boolean;
}

// One seat of a round, identified by the room's playerId: pure game state from shared/game plus the last input sequence.
export class Player {
  public readonly id: string;
  private state: GameState;
  private sequence = 0;

  public constructor(id: string, seed: number) {
    this.id = id;
    this.state = createGameState(seed);
  }

  public get isAlive(): boolean {
    return this.state.isAlive;
  }

  public get lastSequence(): number {
    return this.sequence;
  }

  public get board(): Board {
    return this.state.board;
  }

  public get piece(): Piece | null {
    return this.state.active && new Piece(this.state.active);
  }

  public apply(action: GameAction, sequence: number): PlayerChange {
    this.sequence = sequence;
    return this.update(applyAction(this.state, action));
  }

  public tick(): PlayerChange {
    return this.update(tick(this.state));
  }

  public receivePenalty(lines: number): PlayerChange {
    return this.update({ state: addPenalty(this.state, lines), cleared: 0 });
  }

  public eliminate(): PlayerChange {
    return this.update({ state: eliminate(this.state), cleared: 0 });
  }

  public snapshot(): GameSnapshot {
    const { board, isAlive, score, lines } = this.state;
    return {
      board,
      active: this.piece?.toJSON() ?? null,
      next: nextPiece(this.state),
      isAlive,
      lastSequence: this.sequence,
      score,
      lines,
    };
  }

  public spectrum(): number[] {
    return spectrum(this.state.board);
  }

  private update({ state, cleared }: GameStep): PlayerChange {
    const previous = this.state;
    this.state = state;
    return {
      changed: state !== previous,
      settled: state.board !== previous.board,
      cleared,
      eliminated: previous.isAlive && !state.isAlive,
    };
  }
}

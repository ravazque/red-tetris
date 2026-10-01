import { randomInt } from 'node:crypto';
import { GAME_ACTIONS, type ErrorCode, type GameAction, type RoomRule } from '../../../shared/constants.ts';
import type { GameSnapshot } from '../../../shared/game/types.ts';
import { Player, type PlayerChange } from './Player.ts';

export interface GameSetup {
  readonly roomId: string;
  readonly playerIds: readonly string[];
  readonly seed?: number;
  readonly rule?: RoomRule;
}

// topout: solo ends, or a survival duel has one player left; score: every score-duel player is out, the higher score wins; left / timeout: a player went, the other wins.
export type EndReason = 'topout' | 'score' | 'left' | 'timeout';

export type GameEvent =
  | { readonly type: 'state'; readonly playerId: string; readonly state: GameSnapshot }
  | { readonly type: 'spectrum'; readonly playerId: string; readonly spectrum: readonly number[] }
  | { readonly type: 'penalty'; readonly sourcePlayerId: string; readonly targetPlayerId: string; readonly lines: number }
  | { readonly type: 'eliminated'; readonly playerId: string; readonly reason: EndReason }
  | { readonly type: 'finished'; readonly winnerPlayerId: string | null; readonly reason: EndReason };

export class GameError extends Error {
  public readonly code: ErrorCode;

  public constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'GameError';
    this.code = code;
  }
}

interface Result {
  readonly winnerPlayerId: string | null;
  readonly reason: EndReason;
}

interface Batch {
  readonly penalties: GameEvent[];
  readonly states: Set<Player>;
  readonly spectrums: Set<Player>;
  readonly eliminated: { readonly player: Player; readonly reason: EndReason }[];
  departure: 'left' | 'timeout' | null;
}

// One round: every player draws from the same seeded sequence; commands and ticks return the domain events to broadcast.
export class Game {
  public readonly roomId: string;
  public readonly playerIds: readonly string[];
  public readonly seed: number;
  public readonly rule: RoomRule;
  private readonly players: ReadonlyMap<string, Player>;
  private readonly departed = new Set<string>();
  private paused = false;
  private result: Result | null = null;

  public constructor({ roomId, playerIds, seed = randomInt(2 ** 31), rule = 'survival' }: GameSetup) {
    this.roomId = roomId;
    this.playerIds = [...playerIds];
    this.seed = seed;
    this.rule = rule;
    this.players = new Map(playerIds.map((id) => [id, new Player(id, seed)]));
  }

  public get isPaused(): boolean {
    return this.paused;
  }

  public get isFinished(): boolean {
    return this.result !== null;
  }

  public get winnerPlayerId(): string | null {
    return this.result?.winnerPlayerId ?? null;
  }

  public pause(): void {
    this.paused = true;
  }

  public resume(): void {
    this.paused = false;
  }

  public applyInput(playerId: string, action: GameAction, sequence: number): GameEvent[] {
    const player = this.player(playerId);
    if (!(GAME_ACTIONS as readonly string[]).includes(action)) throw new GameError('INVALID_ACTION', 'Unknown action');
    if (!Number.isInteger(sequence) || sequence < 0) throw new GameError('INVALID_PAYLOAD', 'Invalid sequence');
    if (!this.isRunning() || !player.isAlive || sequence <= player.lastSequence) return [];
    return this.run((batch) => this.record(batch, player, player.apply(action, sequence)));
  }

  public tick(): GameEvent[] {
    if (!this.isRunning()) return [];
    return this.run((batch) => {
      for (const player of this.players.values()) if (player.isAlive) this.record(batch, player, player.tick());
    });
  }

  // Pon-Trix goal: penalty lines outside a line clear.
  public addPenalty(targetPlayerId: string, lines: number, sourcePlayerId: string): GameEvent[] {
    const target = this.player(targetPlayerId);
    const source = this.player(sourcePlayerId);
    if (!this.isRunning() || !target.isAlive || lines <= 0) return [];
    return this.run((batch) => this.penalize(batch, source, target, lines));
  }

  // Leaving ends the round for the others even after a top-out: the one left wins.
  public removePlayer(playerId: string, reason: 'left' | 'timeout' = 'left'): GameEvent[] {
    const player = this.player(playerId);
    if (this.isFinished || this.departed.has(playerId)) return [];
    this.departed.add(playerId);
    return this.run((batch) => {
      batch.departure = reason;
      this.record(batch, player, player.eliminate(), reason);
    });
  }

  public snapshot(playerId: string): GameSnapshot {
    return this.player(playerId).snapshot();
  }

  public spectrum(playerId: string): readonly number[] {
    return this.player(playerId).spectrum();
  }

  private isRunning(): boolean {
    return !this.paused && !this.isFinished;
  }

  private player(playerId: string): Player {
    const player = this.players.get(playerId);
    if (!player) throw new GameError('INVALID_PLAYER', 'Player is not in this game');
    return player;
  }

  private record(batch: Batch, player: Player, change: PlayerChange, reason: EndReason = 'topout'): void {
    if (change.changed) batch.states.add(player);
    if (change.settled) batch.spectrums.add(player);
    if (change.eliminated) batch.eliminated.push({ player, reason });
    if (change.cleared < 2) return;
    for (const rival of this.players.values()) {
      if (rival !== player && rival.isAlive) this.penalize(batch, player, rival, change.cleared - 1);
    }
  }

  private penalize(batch: Batch, source: Player, target: Player, lines: number): void {
    batch.penalties.push({ type: 'penalty', sourcePlayerId: source.id, targetPlayerId: target.id, lines });
    this.record(batch, target, target.receivePenalty(lines));
  }

  private run(apply: (batch: Batch) => void): GameEvent[] {
    const batch: Batch = { penalties: [], states: new Set(), spectrums: new Set(), eliminated: [], departure: null };
    apply(batch);
    const events: GameEvent[] = [
      ...batch.penalties,
      ...[...batch.states].map((player): GameEvent => ({ type: 'state', playerId: player.id, state: player.snapshot() })),
      ...[...batch.spectrums].map((player): GameEvent => ({ type: 'spectrum', playerId: player.id, spectrum: player.spectrum() })),
      ...batch.eliminated.map(({ player, reason }): GameEvent => ({ type: 'eliminated', playerId: player.id, reason })),
    ];
    this.result = this.outcome(batch);
    if (this.result) events.push({ type: 'finished', ...this.result });
    return events;
  }

  // Solo ends on top-out. Survival: the last player standing wins (players out in the same batch: no winner).
  // Score: a topped-out player waits; once nobody is playing, the higher score wins (a tie has no winner). Departures leaving one player: that player wins.
  private outcome(batch: Batch): Result | null {
    const solo = this.playerIds.length === 1;
    const present = this.playerIds.filter((id) => !this.departed.has(id));
    if (batch.departure && !solo && present.length <= 1) return { winnerPlayerId: present[0] ?? null, reason: batch.departure };
    if (batch.eliminated.length === 0) return null;
    const alive = present.filter((id) => this.player(id).isAlive);
    if (solo) return alive.length === 0 ? { winnerPlayerId: null, reason: batch.departure ?? 'topout' } : null;
    if (this.rule === 'survival') return alive.length <= 1 ? { winnerPlayerId: alive[0] ?? null, reason: 'topout' } : null;
    if (alive.length > 0) return null;
    const scores = present.map((id) => ({ id, score: this.player(id).snapshot().score }));
    const best = Math.max(...scores.map(({ score }) => score));
    const leaders = scores.filter(({ score }) => score === best);
    return { winnerPlayerId: leaders.length === 1 ? leaders[0].id : null, reason: 'score' };
  }
}

export type GameFactory = (setup: GameSetup) => Game;

export const createGame: GameFactory = (setup) => new Game(setup);

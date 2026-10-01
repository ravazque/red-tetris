import {
  PONTRIX_ARENA_HEIGHT,
  PONTRIX_ARENA_WIDTH,
  PONTRIX_BALL_SIZE,
  PONTRIX_PADDLE_MAX_Y,
  PONTRIX_PADDLE_MIN_Y,
  PONTRIX_PADDLE_HEIGHT,
  type PaddleDirection,
  type PongState,
} from '../../../shared/game/pontrix.ts';
import { pieceCells } from '../../../shared/game/pieces.ts';
import type { GameSnapshot } from '../../../shared/game/types.ts';

export const PONG_TICK_MS = 50;
// Tunable cells per fixed 50 ms step; the first playtest increase is +25%.
export const PONG_BALL_SPEED = 0.225;
export const PONG_PADDLE_SPEED = 0.32;
export const PONG_MAX_STALL_TICKS = 300;

const BALL_RADIUS = PONTRIX_BALL_SIZE / 2;
const PADDLE_WIDTH = 0.45;
const LEFT_BOARD_X = 1;
const RIGHT_BOARD_X = 15;
const SUBSTEPS = 4;

export type PongEvent =
  | { readonly type: 'state'; readonly state: PongState }
  | { readonly type: 'goal'; readonly targetPlayerId: string; readonly sourcePlayerId: string };

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

// Deterministic room-local Pong simulation. Tetris snapshots are read-only obstacles.
export class Pong {
  private readonly playerIds: readonly [string, string];
  private readonly paddles = new Map<string, number>();
  private readonly directions = new Map<string, PaddleDirection>();
  private readonly goals = new Map<string, number>();
  private ball: Ball;
  private serveCount = 0;
  private stallTicks = 0;

  public constructor(playerIds: readonly string[]) {
    if (playerIds.length !== 2) throw new Error('Pontrix requires exactly two players');
    this.playerIds = [playerIds[0], playerIds[1]];
    for (const playerId of this.playerIds) {
      this.paddles.set(playerId, PONTRIX_ARENA_HEIGHT / 2);
      this.directions.set(playerId, 0);
      this.goals.set(playerId, 0);
    }
    this.ball = this.serve();
  }

  public input(playerId: string, direction: PaddleDirection): void {
    if (!this.paddles.has(playerId)) throw new Error('Player is not in Pontrix');
    this.directions.set(playerId, direction);
  }

  public snapshot(): PongState {
    return {
      ball: { x: this.ball.x, y: this.ball.y },
      paddles: Object.fromEntries(this.paddles),
      goals: Object.fromEntries(this.goals),
    };
  }

  public tick(players: readonly [GameSnapshot, GameSnapshot]): PongEvent[] {
    for (const playerId of this.playerIds) {
      const y = this.paddles.get(playerId) as number;
      const direction = this.directions.get(playerId) as PaddleDirection;
      this.paddles.set(playerId, Math.min(PONTRIX_PADDLE_MAX_Y, Math.max(PONTRIX_PADDLE_MIN_Y, y + direction * PONG_PADDLE_SPEED)));
    }

    let goal: PongEvent | null = null;
    for (let step = 0; step < SUBSTEPS; step += 1) {
      goal = this.step(players);
      if (goal) break;
    }

    if (goal) return [goal, { type: 'state', state: this.snapshot() }];
    this.stallTicks += 1;
    if (this.stallTicks >= PONG_MAX_STALL_TICKS) {
      this.ball = this.serve();
      this.stallTicks = 0;
    }
    return [{ type: 'state', state: this.snapshot() }];
  }

  private step(players: readonly [GameSnapshot, GameSnapshot]): PongEvent | null {
    const previous = { x: this.ball.x, y: this.ball.y };
    const distance = 1 / SUBSTEPS;
    this.ball.x += this.ball.vx * distance;
    if (this.hitBlocks(players, previous, 'x')) {
      this.ball.x = previous.x;
      this.ball.vx *= -1;
    }
    const paddle = this.hitPaddle(previous.x);
    if (paddle) {
      this.ball.x = previous.x;
      this.ball.vx *= -1;
      this.ball.vy = this.paddleAngle(paddle);
      this.stallTicks = 0;
    }
    if (this.ball.x < -BALL_RADIUS) return this.score(this.playerIds[0], this.playerIds[1]);
    if (this.ball.x > PONTRIX_ARENA_WIDTH + BALL_RADIUS) return this.score(this.playerIds[1], this.playerIds[0]);

    const beforeY = this.ball.y;
    this.ball.y += this.ball.vy * distance;
    if (this.ball.y < BALL_RADIUS || this.ball.y > PONTRIX_ARENA_HEIGHT - BALL_RADIUS) {
      this.ball.y = Math.min(PONTRIX_ARENA_HEIGHT - BALL_RADIUS, Math.max(BALL_RADIUS, this.ball.y));
      this.ball.vy *= -1;
    }
    if (this.hitBlocks(players, { x: this.ball.x, y: beforeY }, 'y')) {
      this.ball.y = beforeY;
      this.ball.vy *= -1;
    }
    return null;
  }

  private hitPaddle(previousX: number): 'left' | 'right' | null {
    const left = this.playerIds[0];
    const right = this.playerIds[1];
    const leftY = this.paddles.get(left) as number;
    const rightY = this.paddles.get(right) as number;
    const overlaps = (y: number) => Math.abs(this.ball.y - y) <= (PONTRIX_PADDLE_HEIGHT + PONTRIX_BALL_SIZE) / 2;
    const leftEdge = 0.5 + PADDLE_WIDTH / 2;
    const rightEdge = PONTRIX_ARENA_WIDTH - 0.5 - PADDLE_WIDTH / 2;
    const leftHit = this.ball.vx < 0 && previousX - BALL_RADIUS >= leftEdge && this.ball.x - BALL_RADIUS <= leftEdge && overlaps(leftY);
    const rightHit = this.ball.vx > 0 && previousX + BALL_RADIUS <= rightEdge && this.ball.x + BALL_RADIUS >= rightEdge && overlaps(rightY);
    return leftHit ? 'left' : rightHit ? 'right' : null;
  }

  private paddleAngle(side: 'left' | 'right'): number {
    const paddle = this.paddles.get(side === 'left' ? this.playerIds[0] : this.playerIds[1]) as number;
    const offset = (this.ball.y - paddle) / (PONTRIX_PADDLE_HEIGHT / 2);
    const magnitude = Math.max(0.04, Math.min(0.14, Math.abs(offset) * 0.14));
    return Math.sign(offset || 1) * magnitude;
  }

  private hitBlocks(players: readonly [GameSnapshot, GameSnapshot], previous: Point, axis: 'x' | 'y'): boolean {
    const cells = [
      ...this.occupiedCells(players[0], LEFT_BOARD_X),
      ...this.occupiedCells(players[1], RIGHT_BOARD_X),
    ];
    return cells.some(([x, y]) => {
      const overlaps = this.ball.x + BALL_RADIUS > x && this.ball.x - BALL_RADIUS < x + 1
        && this.ball.y + BALL_RADIUS > y && this.ball.y - BALL_RADIUS < y + 1;
      if (!overlaps) return false;
      if (axis === 'x') return previous.x + BALL_RADIUS <= x || previous.x - BALL_RADIUS >= x + 1;
      return previous.y + BALL_RADIUS <= y || previous.y - BALL_RADIUS >= y + 1;
    });
  }

  private occupiedCells(snapshot: GameSnapshot, offsetX: number): readonly (readonly [number, number])[] {
    const settled = snapshot.board.flatMap((row, y) => row.flatMap((cell, x) => cell === null ? [] : [[offsetX + x, y] as const]));
    const active = snapshot.active ? pieceCells(snapshot.active).filter(([, y]) => y >= 0).map(([x, y]) => [offsetX + x, y] as const) : [];
    return [...settled, ...active];
  }

  private score(targetPlayerId: string, sourcePlayerId: string): PongEvent {
    this.goals.set(sourcePlayerId, (this.goals.get(sourcePlayerId) as number) + 1);
    this.ball = this.serve();
    this.stallTicks = 0;
    return { type: 'goal', targetPlayerId, sourcePlayerId };
  }

  private serve(): Ball {
    this.serveCount += 1;
    const direction = this.serveCount % 2 === 0 ? -1 : 1;
    const vertical = this.serveCount % 3 === 0 ? -0.08 : 0.08;
    return { x: PONTRIX_ARENA_WIDTH / 2, y: PONTRIX_ARENA_HEIGHT / 2, vx: direction * PONG_BALL_SPEED, vy: vertical };
  }
}

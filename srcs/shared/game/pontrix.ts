import { BOARD_HEIGHT, BOARD_WIDTH } from '../constants.ts';

// Pon-Trix arena in cells, x to the right and y down: goal | lane | board | gap | board | lane | goal.
// The server owns the simulation; shared code describes the geometry, the renderable state and pure paddle moves.
export const PONTRIX_LANE_WIDTH = 1;
export const PONTRIX_GAP_WIDTH = 4;
export const PONTRIX_ARENA_WIDTH = 2 * (PONTRIX_LANE_WIDTH + BOARD_WIDTH) + PONTRIX_GAP_WIDTH;
export const PONTRIX_ARENA_HEIGHT = BOARD_HEIGHT;
export const PONTRIX_PADDLE_HEIGHT = 4;
export const PONTRIX_BALL_SIZE = 0.6;

export interface PongBall {
  readonly x: number;
  readonly y: number;
}

// Centres: the ball, and the y of each paddle by playerId (players in join order, first on the left); goals scored by playerId.
export interface PongState {
  readonly ball: PongBall;
  readonly paddles: Readonly<Record<string, number>>;
  readonly goals: Readonly<Record<string, number>>;
}

export const PONTRIX_PADDLE_MIN_Y = PONTRIX_PADDLE_HEIGHT / 2;
export const PONTRIX_PADDLE_MAX_Y = PONTRIX_ARENA_HEIGHT - PONTRIX_PADDLE_HEIGHT / 2;

// Paddle input: W = -1 (up), S = 1 (down), 0 when released; the distance per step is the caller's (speed * elapsed time).
export type PaddleDirection = -1 | 0 | 1;

export const clampPaddleY = (y: number) => Math.min(PONTRIX_PADDLE_MAX_Y, Math.max(PONTRIX_PADDLE_MIN_Y, y));

export const movePaddle = (y: number, direction: PaddleDirection, distance: number) => clampPaddleY(y + direction * distance);

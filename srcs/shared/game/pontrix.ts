import { BOARD_HEIGHT, BOARD_WIDTH } from '../constants.ts';

// Pon-Trix arena in cells, x to the right and y down: goal | lane | board | gap | board | lane | goal.
// PongState holds centres: the ball, and the y of each paddle by playerId (players in join order, first on the left).
export const PONTRIX_LANE_WIDTH = 1;
export const PONTRIX_GAP_WIDTH = 4;
export const PONTRIX_ARENA_WIDTH = 2 * (PONTRIX_LANE_WIDTH + BOARD_WIDTH) + PONTRIX_GAP_WIDTH;
export const PONTRIX_ARENA_HEIGHT = BOARD_HEIGHT;
export const PONTRIX_PADDLE_HEIGHT = 4;
export const PONTRIX_BALL_SIZE = 0.6;

export interface PongState {
  readonly ball: { readonly x: number; readonly y: number };
  readonly paddles: Readonly<Record<string, number>>;
}

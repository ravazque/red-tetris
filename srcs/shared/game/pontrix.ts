export interface PongBall {
  readonly x: number;
  readonly y: number;
}

// The server owns the simulation; shared code only describes the renderable state.
export interface PongState {
  readonly ball: PongBall;
  readonly paddles: Readonly<Record<string, number>>;
}

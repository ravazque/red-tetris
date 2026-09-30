// Minimal server-side seam. Rules and mutable round state are implemented later;
// the room lifecycle only needs a session identity and its participating seats.
export interface Game {
  readonly roomId: string;
  readonly playerIds: readonly string[];
}

export interface GameSetup {
  readonly roomId: string;
  readonly playerIds: readonly string[];
}

export type GameFactory = (setup: GameSetup) => Game;

// Used by lifecycle tests and until the real domain Game is wired in (#21/#6).
export const createPlaceholderGame: GameFactory = (setup) => ({
  roomId: setup.roomId,
  playerIds: setup.playerIds,
});

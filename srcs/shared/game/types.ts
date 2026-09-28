// Board: BOARD_HEIGHT rows of BOARD_WIDTH cells, row 0 on top, null = empty; active is null once the player is out.
// GameSnapshot is the game:state payload: GameState plus the last input sequence the server applied.
export type PieceType = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L';
export type Cell = PieceType | 'penalty' | null;
export type Board = readonly (readonly Cell[])[];
export type Rotation = 0 | 1 | 2 | 3;

export interface ActivePiece {
  readonly type: PieceType;
  readonly rotation: Rotation;
  readonly x: number;
  readonly y: number;
}

export interface GameState {
  readonly board: Board;
  readonly active: ActivePiece | null;
  readonly next: PieceType | null;
  readonly isAlive: boolean;
}

export interface GameSnapshot extends GameState {
  readonly lastSequence: number;
}

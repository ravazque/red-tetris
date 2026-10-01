// Board: BOARD_HEIGHT rows of BOARD_WIDTH cells, row 0 on top, null = empty.
// GameSnapshot.board holds settled blocks only; active is null once the player is out; score and lines follow scoring.ts.
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

export interface GameSnapshot {
  readonly board: Board;
  readonly active: ActivePiece | null;
  readonly next: PieceType | null;
  readonly isAlive: boolean;
  readonly lastSequence: number;
  readonly score: number;
  readonly lines: number;
}

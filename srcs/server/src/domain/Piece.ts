import { pieceCells, type Offset } from '../../../shared/game/pieces.ts';
import type { ActivePiece, PieceType, Rotation } from '../../../shared/game/types.ts';

// Active tetrimino as an immutable value: type, rotation and position; geometry comes from shared/game.
export class Piece implements ActivePiece {
  public readonly type: PieceType;
  public readonly rotation: Rotation;
  public readonly x: number;
  public readonly y: number;

  public constructor({ type, rotation, x, y }: ActivePiece) {
    this.type = type;
    this.rotation = rotation;
    this.x = x;
    this.y = y;
  }

  public cells(): readonly Offset[] {
    return pieceCells(this);
  }

  public toJSON(): ActivePiece {
    return { type: this.type, rotation: this.rotation, x: this.x, y: this.y };
  }
}

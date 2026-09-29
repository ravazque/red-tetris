import type { CSSProperties } from 'react';
import { PIECE_SHAPES } from '../../../shared/game/pieces.ts';
import type { PieceType } from '../../../shared/game/types.ts';
import styles from './PiecePreview.module.css';
import cellStyles from './Cell.module.css';

// Spawn shape of a piece on a grid sized to it and centred in a 4 x 2 box (NEXT box, decoration); empty without a piece.
interface PiecePreviewProps {
  readonly type: PieceType | null;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export const PiecePreview = ({ type, className = '', style }: PiecePreviewProps) => {
  const cells = type ? PIECE_SHAPES[type][0] : [];
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));
  const size = type && { '--cols': Math.max(...cells.map(([x]) => x)) - minX + 1, '--rows': Math.max(...cells.map(([, y]) => y)) - minY + 1 };

  return (
    <div className={`${styles.preview} ${className}`} style={{ ...style, ...size } as CSSProperties} data-piece={type ?? undefined}>
      {cells.map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          className={`${cellStyles.cell} ${cellStyles[type as PieceType]}`}
          style={{ gridColumn: x - minX + 1, gridRow: y - minY + 1 }}
        />
      ))}
    </div>
  );
};

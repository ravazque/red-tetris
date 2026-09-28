import type { CSSProperties } from 'react';
import { PIECE_SHAPES } from '../../../shared/game/pieces.ts';
import type { PieceType } from '../../../shared/game/types.ts';
import styles from './PiecePreview.module.css';
import cellStyles from './Cell.module.css';

// Spawn shape of a piece on its own small grid (NEXT box, decoration); an empty box when there is no piece.
interface PiecePreviewProps {
  readonly type: PieceType | null;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export const PiecePreview = ({ type, className = '', style }: PiecePreviewProps) => {
  const cells = type ? PIECE_SHAPES[type][0] : [];
  const minX = Math.min(...cells.map(([x]) => x));
  const minY = Math.min(...cells.map(([, y]) => y));

  return (
    <div className={`${styles.preview} ${className}`} style={style} data-piece={type ?? undefined}>
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

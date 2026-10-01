import type { CSSProperties } from 'react';
import type { PieceType } from '../../../shared/game/types.ts';
import type { Seat } from '../room/reducer.ts';
import { NEXT_TEXT } from '../texts.ts';
import { PiecePreview } from './PiecePreview.tsx';
import { PixelText } from './PixelText.tsx';
import styles from './FieldHeader.module.css';

interface FieldHeaderProps {
  readonly seat: Seat | null;
  readonly next: PieceType | null;
  readonly crown?: boolean;
  readonly emptyLabel?: string;
  readonly emptySize?: number;
}

// Name, crown for the player ahead on points, you badge and the NEXT box.
export const FieldHeader = ({ seat, next, crown = false, emptyLabel = '', emptySize = 2 }: FieldHeaderProps) => (
  <header className={styles.header}>
    <p className={styles.name}>
      {seat ? <span className={styles.label}>{seat.name}</span> : <PixelText text={emptyLabel} className={styles.empty} style={{ '--px': `${emptySize}px` } as CSSProperties} />}
      {seat && crown && <span className={styles.crown} title="Ahead on points">♛</span>}
      {seat?.self && <PixelText text="you" className={styles.self} />}
    </p>
    <div className={styles.next}>
      <PixelText text={NEXT_TEXT} className={styles.caption} />
      <div className={styles.box} data-testid="next-box">
        <PiecePreview type={next} />
      </div>
    </div>
  </header>
);

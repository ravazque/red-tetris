import type { PieceType } from '../../../shared/game/types.ts';
import type { Seat } from '../room/reducer.ts';
import { PiecePreview } from './PiecePreview.tsx';
import { PixelText } from './PixelText.tsx';
import styles from './FieldHeader.module.css';

export const FieldHeader = ({ seat, next }: { readonly seat: Seat | null; readonly next: PieceType | null }) => (
  <header className={styles.header}>
    <p className={styles.name}>
      {seat ? <span className={styles.label}>{seat.name}</span> : <PixelText text="Waiting…" />}
      {seat?.host && <span className={styles.host} title="Host">♛</span>}
      {seat?.self && <PixelText text="you" className={styles.self} />}
    </p>
    <div className={styles.next}>
      <PixelText text="Next" className={styles.caption} />
      <PiecePreview type={next} />
    </div>
  </header>
);

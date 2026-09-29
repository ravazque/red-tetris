import { boardOf } from '../game/reducer.ts';
import { usePlayerGame } from '../game/hooks.ts';
import type { Seat } from '../room/reducer.ts';
import { WAITING_TEXT } from '../texts.ts';
import { Board } from './Board.tsx';
import { FieldHeader } from './FieldHeader.tsx';
import { PixelText } from './PixelText.tsx';
import { Spectrum } from './Spectrum.tsx';
import styles from './PlayerField.module.css';

// One player's field for solo and versus: header, board and, for a rival, the spectrum; a free seat shows an empty board.
export const PlayerField = ({ seat, className = '' }: { readonly seat: Seat | null; readonly className?: string }) => {
  const { snapshot, spectrum } = usePlayerGame(seat?.playerId);
  const out = snapshot?.isAlive === false;

  return (
    <section className={`${styles.field} ${seat?.self ? styles.self : styles.rival} ${out ? styles.out : ''} ${className}`}>
      <FieldHeader seat={seat} next={snapshot?.next ?? null} emptyLabel={WAITING_TEXT.versus.seat} emptySize={WAITING_TEXT.versus.seatSize} />
      <div className={styles.frame}>
        <Board board={boardOf(snapshot)} />
        {out && (
          <p className={styles.overlay}>
            <PixelText text="Out" />
          </p>
        )}
      </div>
      {seat && !seat.self && <Spectrum heights={spectrum} />}
    </section>
  );
};

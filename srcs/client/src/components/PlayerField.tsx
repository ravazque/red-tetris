import { boardOf, ghostOf } from '../game/reducer.ts';
import { usePlayerGame } from '../game/hooks.ts';
import type { Seat } from '../room/reducer.ts';
import { WAITING_TEXT } from '../texts.ts';
import { Board } from './Board.tsx';
import { BoardFlash, shakeClass } from './BoardFlash.tsx';
import { FieldHeader } from './FieldHeader.tsx';
import { PixelText } from './PixelText.tsx';
import { Spectrum } from './Spectrum.tsx';
import styles from './PlayerField.module.css';

interface PlayerFieldProps {
  readonly seat: Seat | null;
  readonly crown?: boolean;
  readonly spectrum?: boolean;
  readonly className?: string;
}

// One player's field for solo and versus: header, board (ghost on your own) and, in versus, the spectrum strip; a free seat shows an empty board.
export const PlayerField = ({ seat, crown = false, spectrum: withSpectrum = false, className = '' }: PlayerFieldProps) => {
  const { snapshot, spectrum, effects } = usePlayerGame(seat?.playerId);
  const out = snapshot?.isAlive === false;

  return (
    <section className={`${styles.field} ${seat?.self ? styles.self : styles.rival} ${out ? styles.out : ''} ${className}`}>
      <FieldHeader seat={seat} next={snapshot?.next ?? null} crown={crown} emptyLabel={WAITING_TEXT.versus.seat} emptySize={WAITING_TEXT.versus.seatSize} />
      <div className={`${styles.frame} ${shakeClass(effects)}`}>
        <Board board={boardOf(snapshot)} ghost={seat?.self ? ghostOf(snapshot) : null} />
        <BoardFlash effects={effects} />
        {out && (
          <p className={styles.overlay}>
            <PixelText text="Out" />
          </p>
        )}
      </div>
      {withSpectrum && <Spectrum heights={spectrum} className={styles.spectrum} />}
    </section>
  );
};

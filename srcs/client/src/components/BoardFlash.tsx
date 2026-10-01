import type { BoardEffects } from '../game/reducer.ts';
import styles from './BoardFlash.module.css';

// Shake for the board's container: the class alternates so every new penalty restarts the animation.
export const shakeClass = ({ penalties }: BoardEffects) => (penalties === 0 ? '' : penalties % 2 ? styles.shakeOdd : styles.shakeEven);

// Flashes over a board (inside a positioned container): light on a line clear, a rising tint on incoming penalty rows.
export const BoardFlash = ({ effects }: { readonly effects: BoardEffects }) => (
  <>
    {effects.clears > 0 && <span key={`clear-${effects.clears}`} className={styles.clear} data-testid="clear-flash" aria-hidden="true" />}
    {effects.penalties > 0 && (
      <span key={`penalty-${effects.penalties}`} className={styles.penalty} data-testid="penalty-flash" aria-hidden="true" />
    )}
  </>
);

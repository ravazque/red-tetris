import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import styles from './Spectrum.module.css';

const EMPTY = Array<number>(BOARD_WIDTH).fill(0);

// Opponent spectrum: height of each column's highest block.
export const Spectrum = ({ heights = EMPTY }: { readonly heights?: readonly number[] }) => (
  <div className={styles.spectrum} aria-label="Spectrum">
    {heights.map((height, column) => (
      <div key={column} className={styles.column}>
        <div className={styles.bar} style={{ height: `${(height / BOARD_HEIGHT) * 100}%` }} />
      </div>
    ))}
  </div>
);

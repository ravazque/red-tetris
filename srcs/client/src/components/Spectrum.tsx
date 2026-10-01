import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import styles from './Spectrum.module.css';

const EMPTY = Array<number>(BOARD_WIDTH).fill(0);

// Spectrum: height of each column's highest block (versus and Pon-Trix, both players).
export const Spectrum = ({ heights = EMPTY, className = '' }: { readonly heights?: readonly number[]; readonly className?: string }) => (
  <div className={`${styles.spectrum} ${className}`} aria-label="Spectrum">
    {heights.map((height, column) => (
      <div key={column} className={styles.column}>
        <div className={styles.bar} style={{ height: `${(height / BOARD_HEIGHT) * 100}%` }} />
      </div>
    ))}
  </div>
);

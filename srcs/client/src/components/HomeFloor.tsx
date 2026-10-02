import type { CSSProperties } from 'react';
import styles from './HomeFloor.module.css';

const ROWS = 9;
const SIDE_COLUMNS = 36;

// Static perspective floor behind the menu: rows spaced by depth and fading out, columns as rays from the horizon.
export const HomeFloor = () => (
  <div className={styles.floor} style={{ '--rows': ROWS } as CSSProperties} aria-hidden="true" data-testid="home-floor">
    {Array.from({ length: ROWS }, (_, i) => (
      <span key={`row-${i}`} className={styles.row} style={{ '--i': i } as CSSProperties} />
    ))}
    {Array.from({ length: SIDE_COLUMNS * 2 + 1 }, (_, i) => (
      <span key={`column-${i}`} className={styles.column} style={{ '--j': i - SIDE_COLUMNS } as CSSProperties} />
    ))}
  </div>
);

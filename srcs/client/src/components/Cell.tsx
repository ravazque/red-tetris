import { memo } from 'react';
import type { Cell as CellValue } from '../../../shared/game/types.ts';
import styles from './Cell.module.css';

export const Cell = memo(({ value }: { readonly value: CellValue }) => (
  <div className={`${styles.cell} ${styles[value ?? 'empty']}`} />
));

import { memo } from 'react';
import type { Cell as CellValue, PieceType } from '../../../shared/game/types.ts';
import styles from './Cell.module.css';

export const Cell = memo(({ value, ghost = null }: { readonly value: CellValue; readonly ghost?: PieceType | null }) => (
  <div className={`${styles.cell} ${ghost ? `${styles[ghost]} ${styles.ghost}` : styles[value ?? 'empty']}`} />
));

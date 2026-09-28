import type { Board as BoardGrid } from '../../../shared/game/types.ts';
import { Cell } from './Cell.tsx';
import styles from './Board.module.css';

export const Board = ({ board }: { readonly board: BoardGrid }) => (
  <div className={styles.board}>
    {board.map((row, y) => row.map((cell, x) => <Cell key={`${y}-${x}`} value={cell} />))}
  </div>
);

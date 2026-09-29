import type { Board as BoardGrid } from '../../../shared/game/types.ts';
import { Cell } from './Cell.tsx';
import styles from './Board.module.css';

export const Board = ({ board, className = '' }: { readonly board: BoardGrid; readonly className?: string }) => (
  <div className={`${styles.board} ${className}`} data-testid="board">
    {board.map((row, y) => row.map((cell, x) => <Cell key={`${y}-${x}`} value={cell} />))}
  </div>
);

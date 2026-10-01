import { BOARD_WIDTH } from '../../../shared/constants.ts';
import { pieceCells } from '../../../shared/game/pieces.ts';
import type { ActivePiece, Board as BoardGrid } from '../../../shared/game/types.ts';
import { Cell } from './Cell.tsx';
import styles from './Board.module.css';

interface BoardProps {
  readonly board: BoardGrid;
  readonly ghost?: ActivePiece | null;
  readonly className?: string;
}

// 10 x 20 grid of cells; the ghost outlines where the active piece would land, on empty cells only.
export const Board = ({ board, ghost = null, className = '' }: BoardProps) => {
  const ghostCells = new Set(ghost ? pieceCells(ghost).map(([x, y]) => y * BOARD_WIDTH + x) : []);
  return (
    <div className={`${styles.board} ${className}`} data-testid="board">
      {board.map((row, y) =>
        row.map((cell, x) => (
          <Cell key={`${y}-${x}`} value={cell} ghost={ghost && cell === null && ghostCells.has(y * BOARD_WIDTH + x) ? ghost.type : null} />
        )),
      )}
    </div>
  );
};

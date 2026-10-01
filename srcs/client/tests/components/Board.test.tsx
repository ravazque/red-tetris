import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import { Board } from '../../src/components/Board.tsx';
import { fromRows } from '../helpers/board.ts';

describe('Board', () => {
  it('renders one cell per board position', () => {
    const { container } = render(<Board board={fromRows(['T.........'])} />);

    expect(container.firstElementChild?.children).toHaveLength(BOARD_WIDTH * BOARD_HEIGHT);
  });

  it('gives filled and empty cells different classes', () => {
    const { container } = render(<Board board={fromRows(['T.........'])} />);
    const cells = container.firstElementChild?.children;
    const bottomLeft = cells?.item(BOARD_WIDTH * (BOARD_HEIGHT - 1));
    const bottomRight = cells?.item(BOARD_WIDTH * BOARD_HEIGHT - 1);

    expect(bottomLeft?.className).not.toBe(bottomRight?.className);
  });

  it('draws the ghost only on empty cells, keeping one cell per position', () => {
    const { container } = render(<Board board={fromRows(['..........', 'TTT.......'])} ghost={{ type: 'I', rotation: 0, x: 1, y: 17 }} />);
    const cells = [...(container.firstElementChild?.children ?? [])];
    const ghosts = cells.flatMap((cell, index) => (/ghost/.test(cell.className) ? [index] : []));

    expect(cells).toHaveLength(BOARD_WIDTH * BOARD_HEIGHT);
    expect(ghosts).toEqual([181, 182, 183, 184]);
    expect(cells[181].className).toMatch(/_I_/);
  });
});

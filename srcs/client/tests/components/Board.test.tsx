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
});

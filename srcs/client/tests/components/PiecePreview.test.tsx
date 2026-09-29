import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PIECE_TYPES } from '../../../shared/game/pieces.ts';
import { PiecePreview } from '../../src/components/PiecePreview.tsx';

describe('PiecePreview', () => {
  it.each(PIECE_TYPES)('draws the 4 cells of %s', (type) => {
    const { container } = render(<PiecePreview type={type} />);

    expect(container.firstElementChild?.getAttribute('data-piece')).toBe(type);
    expect(container.firstElementChild?.children).toHaveLength(4);
  });

  it.each([
    ['I', '4', '1'],
    ['O', '2', '2'],
    ['T', '3', '2'],
  ] as const)('sizes the grid to the %s piece so it stays centred', (type, cols, rows) => {
    const { container } = render(<PiecePreview type={type} style={{ left: '5%' }} />);
    const { style } = container.firstElementChild as HTMLElement;

    expect([style.getPropertyValue('--cols'), style.getPropertyValue('--rows')]).toEqual([cols, rows]);
    expect(style.left).toBe('5%');
  });

  it('draws an empty box without a piece', () => {
    const { container } = render(<PiecePreview type={null} />);

    expect(container.firstElementChild?.children).toHaveLength(0);
  });
});

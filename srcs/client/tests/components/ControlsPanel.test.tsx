import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ControlsPanel } from '../../src/components/ControlsPanel.tsx';

const rows = () =>
  within(screen.getByRole('region', { name: 'Controls' }))
    .getAllByRole('term')
    .map((term) => [
      [...term.querySelectorAll('kbd')].map((key) => key.textContent),
      term.nextElementSibling?.textContent,
    ]);

describe('ControlsPanel', () => {
  it('lists the Tetris keys, each with its action', () => {
    render(<ControlsPanel paddle={false} />);

    expect(rows()).toEqual([
      [['←', '→'], 'Move'],
      [['↑'], 'Rotate'],
      [['↓'], 'Soft drop'],
      [['Space'], 'Hard drop'],
    ]);
  });

  it('adds the paddle keys for Pon-Trix', () => {
    render(<ControlsPanel paddle />);

    expect(rows().at(-1)).toEqual([['W', 'S'], 'Paddle']);
  });
});

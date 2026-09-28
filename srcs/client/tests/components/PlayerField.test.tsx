import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerField } from '../../src/components/PlayerField.tsx';
import type { Seat } from '../../src/room/reducer.ts';
import { renderWithStore } from '../helpers/render.tsx';
import { snapshotOf } from '../helpers/room.ts';

const alice: Seat = { playerId: 'p1', name: 'alice', self: false, host: true };
const bobby: Seat = { playerId: 'p2', name: 'bobby', self: true, host: false };

const game = {
  revision: 3,
  players: { p2: snapshotOf(['JJJ.......'], { active: { type: 'T', rotation: 0, x: 3, y: 0 }, next: 'I' as const }) },
  spectrums: { p1: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
};

const cells = () => [...screen.getByTestId('board').children].map((cell) => cell.className);

describe('PlayerField', () => {
  it('shows the local player with its board, active piece and next piece', () => {
    const { container } = renderWithStore(<PlayerField seat={bobby} />, { game });

    expect(screen.getByText('bobby')).toBeTruthy();
    expect(screen.getByText('you')).toBeTruthy();
    expect(container.querySelector('[data-piece]')?.getAttribute('data-piece')).toBe('I');
    expect(cells().filter((name) => /\bT\b|_T_/.test(name))).toHaveLength(4);
    expect(screen.queryByLabelText('Spectrum')).toBeNull();
  });

  it('shows a rival with the host badge and its spectrum', () => {
    renderWithStore(<PlayerField seat={alice} />, { game });

    expect(screen.getByTitle('Host')).toBeTruthy();
    expect(screen.queryByText('you')).toBeNull();
    expect(screen.getByLabelText('Spectrum')).toBeTruthy();
  });

  it('keeps an empty board for a free seat', () => {
    renderWithStore(<PlayerField seat={null} />);

    expect(screen.getByText('Waiting for a rival…')).toBeTruthy();
    expect(screen.getByTestId('board').children).toHaveLength(200);
  });

  it('marks an eliminated player', () => {
    renderWithStore(<PlayerField seat={bobby} />, {
      game: { ...game, players: { p2: snapshotOf([], { isAlive: false }) } },
    });

    expect(screen.getByText('Out')).toBeTruthy();
  });
});

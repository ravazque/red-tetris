import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlayerField } from '../../src/components/PlayerField.tsx';
import type { Seat } from '../../src/room/reducer.ts';
import { NEXT_TEXT, WAITING_TEXT } from '../../src/texts.ts';
import { renderWithStore } from '../helpers/render.tsx';
import { snapshotOf } from '../helpers/room.ts';

const alice: Seat = { playerId: 'p1', name: 'alice', self: false };
const bobby: Seat = { playerId: 'p2', name: 'bobby', self: true };

const game = {
  revision: 3,
  players: { p2: snapshotOf(['JJJ.......'], { active: { type: 'T', rotation: 0, x: 3, y: 0 }, next: 'I' as const }) },
  spectrums: { p1: [4, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  effects: {},
};

const cells = () => [...screen.getByTestId('board').children].map((cell) => cell.className);

describe('PlayerField', () => {
  it('shows the local player with its board, active piece and next piece', () => {
    const { container } = renderWithStore(<PlayerField seat={bobby} />, { game });

    expect(screen.getByText('bobby')).toBeTruthy();
    expect(screen.getByText('you')).toBeTruthy();
    expect(container.querySelector('[data-piece]')?.getAttribute('data-piece')).toBe('I');
    expect(cells().filter((name) => /\bT\b|_T_/.test(name) && !/ghost/.test(name))).toHaveLength(4);
    expect(screen.queryByLabelText('Spectrum')).toBeNull();
  });

  it('outlines where your piece would land, but not the rival\'s', () => {
    const { unmount } = renderWithStore(<PlayerField seat={bobby} />, { game });
    const ghosts = () => cells().filter((name) => /ghost/.test(name));
    expect(ghosts()).toHaveLength(4);
    expect(ghosts().every((name) => /_T_/.test(name))).toBe(true);

    unmount();
    renderWithStore(<PlayerField seat={{ ...alice, playerId: 'p2' }} />, { game });
    expect(ghosts()).toEqual([]);
  });

  it('flashes and shakes the board for line clears and penalties', () => {
    const { container, unmount } = renderWithStore(<PlayerField seat={bobby} />, { game });
    expect(screen.queryByTestId('clear-flash')).toBeNull();
    expect(screen.queryByTestId('penalty-flash')).toBeNull();

    unmount();
    const flashing = renderWithStore(<PlayerField seat={bobby} />, { game: { ...game, effects: { p2: { clears: 2, penalties: 1 } } } });
    expect(screen.getByTestId('clear-flash')).toBeTruthy();
    expect(screen.getByTestId('penalty-flash')).toBeTruthy();
    expect(flashing.container.querySelector('[class*=shakeOdd]')).toBeTruthy();
    expect(container.querySelector('[class*=shake]')).toBeNull();
  });

  it('shows the spectrum strip only when asked (versus), for any player', () => {
    const { unmount } = renderWithStore(<PlayerField seat={alice} spectrum />, { game });
    expect(screen.queryByText('you')).toBeNull();
    expect(screen.getByLabelText('Spectrum')).toBeTruthy();

    unmount();
    const own = renderWithStore(<PlayerField seat={bobby} spectrum />, { game });
    expect(screen.getByLabelText('Spectrum')).toBeTruthy();

    own.unmount();
    renderWithStore(<PlayerField seat={alice} />, { game });
    expect(screen.queryByLabelText('Spectrum')).toBeNull();
  });

  it('wears the crown only when told it is ahead', () => {
    const { unmount } = renderWithStore(<PlayerField seat={alice} />, { game });
    expect(screen.queryByTitle('Ahead on points')).toBeNull();

    unmount();
    renderWithStore(<PlayerField seat={alice} crown />, { game });
    expect(screen.getByTitle('Ahead on points').textContent).toBe('♛');
  });

  it('never crowns a free seat', () => {
    renderWithStore(<PlayerField seat={null} crown />);

    expect(screen.queryByTitle('Ahead on points')).toBeNull();
  });

  it('keeps an empty board for a free seat', () => {
    renderWithStore(<PlayerField seat={null} />);

    expect(screen.getByText(WAITING_TEXT.versus.seat).parentElement?.style.getPropertyValue('--px')).toBe(`${WAITING_TEXT.versus.seatSize}px`);
    expect(screen.getByTestId('next-box')).toBeTruthy();
    expect(screen.getByText(NEXT_TEXT)).toBeTruthy();
    expect(screen.queryByText('Waiting for a rival…')).toBeNull();
    expect(screen.getByTestId('board').children).toHaveLength(200);
  });

  it('marks an eliminated player', () => {
    renderWithStore(<PlayerField seat={bobby} />, {
      game: { ...game, players: { p2: snapshotOf([], { isAlive: false }) } },
    });

    expect(screen.getByText('Out')).toBeTruthy();
  });
});

import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PONTRIX_ARENA_HEIGHT, PONTRIX_ARENA_WIDTH } from '../../../shared/game/pontrix.ts';
import { PongArena } from '../../src/components/PongArena.tsx';
import type { Seat } from '../../src/room/reducer.ts';
import { renderWithStore } from '../helpers/render.tsx';

const alice: Seat = { playerId: 'p1', name: 'alice', self: true, host: true };
const bobby: Seat = { playerId: 'p2', name: 'bobby', self: false, host: false };

const position = (element: Element) => {
  const { style } = element as HTMLElement;
  return [style.getPropertyValue('--x'), style.getPropertyValue('--y')];
};

const paddles = () => [...screen.getByTestId('pong-arena').querySelectorAll('[style*="--x"]')].filter(
  (element) => element !== screen.getByTestId('pong-ball'),
);

describe('PongArena', () => {
  it('spans two boards, two lanes and the gap', () => {
    expect(PONTRIX_ARENA_WIDTH).toBe(26);
    expect(PONTRIX_ARENA_HEIGHT).toBe(20);
  });

  it('rests the ball at the centre and waits for a rival', () => {
    renderWithStore(<PongArena left={alice} right={null} />);

    expect(position(screen.getByTestId('pong-ball'))).toEqual(['13', '10']);
    expect(screen.getAllByTestId('board')).toHaveLength(2);
    expect(screen.getByText('Waiting for a rival…')).toBeTruthy();
    expect(paddles()).toHaveLength(1);
  });

  it('places the ball and both paddles from pong:state', () => {
    renderWithStore(<PongArena left={alice} right={bobby} />, {
      pong: { revision: 4, state: { ball: { x: 7.5, y: 3 }, paddles: { p1: 5, p2: 12 } } },
    });

    expect(position(screen.getByTestId('pong-ball'))).toEqual(['7.5', '3']);
    expect(paddles().map(position)).toEqual([
      ['0.5', '5'],
      ['25.5', '12'],
    ]);
    expect(screen.getByText('bobby')).toBeTruthy();
    expect(screen.getAllByLabelText('Spectrum')).toHaveLength(1);
  });
});

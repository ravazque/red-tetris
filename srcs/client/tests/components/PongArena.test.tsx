import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PONTRIX_ARENA_HEIGHT, PONTRIX_ARENA_WIDTH } from '../../../shared/game/pontrix.ts';
import { pongStateReceived } from '../../src/app/actions.ts';
import { PongArena } from '../../src/components/PongArena.tsx';
import type { Seat } from '../../src/room/reducer.ts';
import { WAITING_TEXT } from '../../src/texts.ts';
import { renderWithStore } from '../helpers/render.tsx';

const alice: Seat = { playerId: 'p1', name: 'alice', self: true, host: true };
const bobby: Seat = { playerId: 'p2', name: 'bobby', self: false, host: false };

const position = (element: Element) => {
  const { style } = element as HTMLElement;
  return [style.getPropertyValue('--x'), style.getPropertyValue('--y')];
};

const paddles = () => screen.queryAllByTestId('pong-paddle');

describe('PongArena', () => {
  it('spans two boards, two lanes and the gap', () => {
    expect(PONTRIX_ARENA_WIDTH).toBe(26);
    expect(PONTRIX_ARENA_HEIGHT).toBe(20);
  });

  it('rests the ball at the centre with one paddle while the seat is free', () => {
    renderWithStore(<PongArena left={alice} right={null} />);

    expect(position(screen.getByTestId('pong-ball'))).toEqual(['13', '10']);
    expect(screen.getAllByTestId('board')).toHaveLength(2);
    expect(screen.queryByText('Waiting for a rival…')).toBeNull();
    expect(screen.getByText(WAITING_TEXT.pontrix.seat).parentElement?.style.getPropertyValue('--px')).toBe(`${WAITING_TEXT.pontrix.seatSize}px`);
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

  it('moves each paddle with pong:state and keeps it inside the lane', () => {
    const { store } = renderWithStore(<PongArena left={alice} right={bobby} />);

    expect(paddles().map(position)).toEqual([
      ['0.5', '10'],
      ['25.5', '10'],
    ]);

    act(() => {
      store.dispatch(pongStateReceived({ roomId: 'room1', revision: 1, state: { ball: { x: 13, y: 10 }, paddles: { p1: 3.5, p2: 40 } } }));
    });

    expect(paddles().map(position)).toEqual([
      ['0.5', '3.5'],
      ['25.5', '18'],
    ]);
  });

  it('shows the free seat only with something to offer in it', () => {
    renderWithStore(
      <PongArena left={alice} right={null}>
        <p>invite here</p>
      </PongArena>,
    );

    expect(screen.getByText('invite here')).toBeTruthy();
  });

  it('keeps join order when the local player joined second', () => {
    const second: Seat = { ...alice, self: false, host: true };
    const me: Seat = { ...bobby, self: true, host: false };
    renderWithStore(<PongArena left={second} right={me} />, {
      game: { revision: 3, players: {}, spectrums: { p1: [1, 2, 3, 0, 0, 0, 0, 0, 0, 0] } },
    });

    const arena = screen.getByTestId('pong-arena');
    const spectrum = screen.getByLabelText('Spectrum');

    expect(arena.className).toMatch(/selfRight/);
    expect(arena.children[0].contains(screen.getByText('alice'))).toBe(true);
    expect(arena.lastElementChild?.previousElementSibling?.contains(spectrum)).toBe(true);
    expect(paddles()).toHaveLength(2);
  });
});

import { act, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PONTRIX_ARENA_HEIGHT, PONTRIX_ARENA_WIDTH } from '../../../shared/game/pontrix.ts';
import { pongStateReceived } from '../../src/app/actions.ts';
import { PongArena } from '../../src/components/PongArena.tsx';
import type { Seat } from '../../src/room/reducer.ts';
import { WAITING_TEXT } from '../../src/texts.ts';
import { renderWithStore } from '../helpers/render.tsx';
import { snapshotOf } from '../helpers/room.ts';

const alice: Seat = { playerId: 'p1', name: 'alice', self: true };
const bobby: Seat = { playerId: 'p2', name: 'bobby', self: false };

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

  it('crowns the seat named by crownId, on either side, and nobody without one', () => {
    const crowned = () => screen.queryAllByTitle('Ahead on points').map((crown) => crown.parentElement?.textContent);
    const { unmount } = renderWithStore(<PongArena left={alice} right={bobby} crownId="p2" />);
    expect(crowned()).toEqual([expect.stringContaining('bobby')]);

    unmount();
    const second = renderWithStore(<PongArena left={alice} right={bobby} crownId="p1" />);
    expect(crowned()).toEqual([expect.stringContaining('alice')]);

    second.unmount();
    renderWithStore(<PongArena left={alice} right={bobby} />);
    expect(crowned()).toEqual([]);
  });

  it('outlines the ghost on your own board only', () => {
    const active = { type: 'O' as const, rotation: 0 as const, x: 3, y: 0 };
    renderWithStore(<PongArena left={alice} right={bobby} />, {
      game: { revision: 1, players: { p1: snapshotOf([], { active }), p2: snapshotOf([], { active }) }, spectrums: {}, effects: {} },
    });
    const [own, rival] = screen.getAllByTestId('board');

    expect([...own.children].filter((cell) => /ghost/.test(cell.className))).toHaveLength(4);
    expect([...rival.children].filter((cell) => /ghost/.test(cell.className))).toHaveLength(0);
  });

  it('places the ball and both paddles from pong:state', () => {
    renderWithStore(<PongArena left={alice} right={bobby} />, {
      pong: { revision: 4, state: { ball: { x: 7.5, y: 3 }, paddles: { p1: 5, p2: 12 }, goals: {}, serving: false, vanish: null } },
    });

    expect(position(screen.getByTestId('pong-ball'))).toEqual(['7.5', '3']);
    expect(paddles().map(position)).toEqual([
      ['0.5', '5'],
      ['25.5', '12'],
    ]);
    expect(screen.getByText('bobby')).toBeTruthy();
    expect(screen.getAllByLabelText('Spectrum')).toHaveLength(2);
  });

  it('moves each paddle with pong:state and keeps it inside the lane', () => {
    const { store } = renderWithStore(<PongArena left={alice} right={bobby} />);

    expect(paddles().map(position)).toEqual([
      ['0.5', '10'],
      ['25.5', '10'],
    ]);

    act(() => {
      store.dispatch(pongStateReceived({ roomId: 'room1', revision: 1, state: { ball: { x: 13, y: 10 }, paddles: { p1: 3.5, p2: 40 }, goals: {}, serving: false, vanish: null } }));
    });

    expect(paddles().map(position)).toEqual([
      ['0.5', '3.5'],
      ['25.5', '18'],
    ]);
  });

  it('bursts a stalled ball where it vanished and serves it again from the centre', () => {
    const { store } = renderWithStore(<PongArena left={alice} right={bobby} />, {
      pong: { revision: 1, state: { ball: { x: 20, y: 4 }, paddles: {}, goals: {}, serving: false, vanish: null } },
    });
    const ball = screen.getByTestId('pong-ball');
    expect(screen.queryByTestId('pong-vanish')).toBeNull();

    act(() => {
      store.dispatch(pongStateReceived({ roomId: 'room1', revision: 2, state: { ball: { x: 13, y: 10 }, paddles: {}, goals: {}, serving: true, vanish: { id: 1, x: 20, y: 4 } } }));
    });

    expect(position(screen.getByTestId('pong-vanish'))).toEqual(['20', '4']);
    expect(screen.getByTestId('pong-vanish').children).toHaveLength(14);
    expect(screen.getByTestId('pong-ball')).not.toBe(ball);
    expect(screen.getByTestId('pong-ball').className).toMatch(/serving/);

    act(() => {
      store.dispatch(pongStateReceived({ roomId: 'room1', revision: 3, state: { ball: { x: 13.2, y: 10 }, paddles: {}, goals: {}, serving: false, vanish: { id: 1, x: 20, y: 4 } } }));
    });

    expect(screen.queryByTestId('pong-vanish')).toBeNull();
    expect(screen.getByTestId('pong-ball').className).not.toMatch(/serving/);
  });

  it('keeps join order when the local player joined second', () => {
    const second: Seat = { ...alice, self: false };
    const me: Seat = { ...bobby, self: true };
    renderWithStore(<PongArena left={second} right={me} />, {
      game: { revision: 3, players: {}, spectrums: { p1: [1, 2, 3, 0, 0, 0, 0, 0, 0, 0] }, effects: {} },
    });

    const arena = screen.getByTestId('pong-arena');
    const [leftSpectrum, rightSpectrum] = screen.getAllByLabelText('Spectrum');
    const filled = (strip: Element) => [...strip.children].filter((column) => (column.firstElementChild as HTMLElement).style.height !== '0%').length;

    expect(arena.className).toMatch(/selfRight/);
    expect(arena.children[0].contains(screen.getByText('alice'))).toBe(true);
    expect(arena.lastElementChild?.previousElementSibling?.contains(leftSpectrum)).toBe(true);
    expect([filled(leftSpectrum), filled(rightSpectrum)]).toEqual([3, 0]);
    expect(paddles()).toHaveLength(2);
  });
});

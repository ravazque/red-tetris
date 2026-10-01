import { act, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { gameStateReceived } from '../../src/app/actions.ts';
import { ScorePanel } from '../../src/components/ScorePanel.tsx';
import { BEST_SCORE_KEY } from '../../src/game/hooks.ts';
import type { Seat } from '../../src/room/reducer.ts';
import { renderWithStore } from '../helpers/render.tsx';
import { snapshotOf } from '../helpers/room.ts';

const alice: Seat = { playerId: 'p1', name: 'alice', self: true };
const bobby: Seat = { playerId: 'p2', name: 'bobby', self: false };

const scores = (entries: Record<string, [score: number, lines: number]>) => ({
  game: {
    revision: 1,
    spectrums: {},
    effects: {},
    players: Object.fromEntries(Object.entries(entries).map(([id, [score, lines]]) => [id, snapshotOf([], { score, lines })])),
  },
});

const block = (id: 'self' | 'rival') => screen.getByTestId(`score-${id}`);
const has = (id: 'self' | 'rival', text: string) => within(block(id)).getByText(text);

describe('ScorePanel', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows your points, lines and the stored best in a solo room', () => {
    localStorage.setItem(BEST_SCORE_KEY, '20300');
    renderWithStore(<ScorePanel layout="solo" left={alice} right={null} best />, scores({ p1: [12450, 38] }));

    expect(screen.getByRole('region', { name: 'Score' })).toBeTruthy();
    expect(has('self', '12450')).toBeTruthy();
    expect(has('self', '38')).toBeTruthy();
    expect(screen.getByText('Best').parentElement?.nextElementSibling?.textContent).toBe('20300');
    expect(screen.queryByTestId('score-rival')).toBeNull();
  });

  it('counts from 0 and leaves the best out of a versus played alone', () => {
    renderWithStore(<ScorePanel layout="solo" left={alice} right={null} best={false} />);

    expect(within(block('self')).getAllByText('0')).toHaveLength(2);
    expect(screen.queryByText('Best')).toBeNull();
  });

  it('puts both players face to face with your share of the lead bar', () => {
    const { container } = renderWithStore(<ScorePanel layout="versus" left={alice} right={bobby} best={false} />, scores({ p1: [12450, 38], p2: [9800, 27] }));

    expect(has('self', 'You')).toBeTruthy();
    expect(has('self', '12450')).toBeTruthy();
    expect(has('rival', 'Rival')).toBeTruthy();
    expect(has('rival', '9800')).toBeTruthy();
    expect(has('rival', '27')).toBeTruthy();
    expect(screen.getByText('You +2650')).toBeTruthy();
    expect(Number.parseFloat((container.querySelector('[style*="--share"]') as HTMLElement).style.getPropertyValue('--share'))).toBeCloseTo(55.955, 2);
    expect(screen.queryByText('Goals')).toBeNull();
  });

  it('names the rival when the rival leads, and a tie when nobody does', () => {
    const { store } = renderWithStore(<ScorePanel layout="versus" left={alice} right={bobby} best={false} />, scores({ p1: [100, 1], p2: [400, 2] }));

    expect(screen.getByText('Rival +300')).toBeTruthy();

    act(() => {
      store.dispatch(gameStateReceived({ roomId: 'room1', revision: 2, playerId: 'p1', state: snapshotOf([], { score: 400 }) }));
    });

    expect(screen.getByText('Tied')).toBeTruthy();
  });

  it('shows a tie with zeros while the rival seat is free', () => {
    renderWithStore(<ScorePanel layout="versus" left={alice} right={null} best={false} />, scores({ p1: [0, 0] }));

    expect(within(block('rival')).getAllByText('0')).toHaveLength(2);
    expect(screen.getByText('Tied')).toBeTruthy();
  });

  it('adds the goals of each player in Pon-Trix', () => {
    renderWithStore(<ScorePanel layout="pontrix" left={alice} right={bobby} best={false} />, {
      ...scores({ p1: [0, 0], p2: [0, 0] }),
      pong: { revision: 1, state: { ball: { x: 13, y: 10 }, paddles: {}, goals: { p1: 3, p2: 1 } } },
    });

    expect(within(block('self')).getByText('Goals').parentElement?.nextElementSibling?.textContent).toBe('3');
    expect(within(block('rival')).getByText('Goals').parentElement?.nextElementSibling?.textContent).toBe('1');
  });

  it('follows the arena sides in Pon-Trix when you joined second', () => {
    const { container } = renderWithStore(
      <ScorePanel layout="pontrix" left={{ ...alice, self: false }} right={{ ...bobby, self: true }} best={false} />,
      scores({ p1: [300, 0], p2: [100, 0] }),
    );

    expect(screen.getAllByTestId(/^score-/).map((element) => element.dataset.testid)).toEqual(['score-rival', 'score-self']);
    expect(screen.getByText('Rival +200')).toBeTruthy();
    expect((container.querySelector('[style*="--share"]') as HTMLElement).style.getPropertyValue('--share')).toBe('75%');
  });

  it('marks scores over six digits so they are drawn one pixel smaller', () => {
    renderWithStore(<ScorePanel layout="versus" left={alice} right={bobby} best={false} />, scores({ p1: [1234567, 0], p2: [950, 0] }));

    const classOf = (text: string) => screen.getByText(text).parentElement?.className;

    expect(classOf('1234567')).toMatch(/long/);
    expect(classOf('950')).not.toMatch(/long/);
  });
});

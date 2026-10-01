import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameOver } from '../../src/components/GameOver.tsx';
import { ALICE, BOBBY, roomOf, snapshotOf } from '../helpers/room.ts';
import { renderWithStore } from '../helpers/render.tsx';

const finished = roomOf({ phase: 'finished' });

describe('GameOver', () => {
  it('stays hidden until the round is over', () => {
    renderWithStore(<GameOver />, { room: roomOf({ phase: 'running' }) });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('congratulates the winner; as host, it waits for the guest to be ready', () => {
    renderWithStore(<GameOver />, { room: { ...finished, selfPlayerId: 'p1', winnerPlayerId: 'p1' } });

    expect(screen.getByRole('heading').textContent).toBe('You win');
    expect(screen.getByText('bobby topped out')).toBeTruthy();
    expect(screen.getByText('Waiting for bobby to be ready')).toBeTruthy();
  });

  it('explains a win by forfeit', () => {
    const won = { ...finished, selfPlayerId: 'p1', winnerPlayerId: 'p1' };
    const { unmount } = renderWithStore(<GameOver />, { room: { ...won, finishReason: 'left' } });

    expect(screen.getByText('bobby left the game')).toBeTruthy();

    unmount();
    renderWithStore(<GameOver />, { room: { ...won, finishReason: 'timeout', players: [ALICE] } });

    expect(screen.getByText('Your rival did not reconnect in time')).toBeTruthy();
  });

  it('names the winner to the loser; as guest, it asks for Ready', () => {
    renderWithStore(<GameOver />, { room: { ...finished, winnerPlayerId: 'p1' } });

    expect(screen.getByRole('heading').textContent).toBe('You lose');
    expect(screen.getByText('alice wins')).toBeTruthy();
    expect(screen.getByText('Press Ready for a rematch')).toBeTruthy();
  });

  it('follows the rematch: the ready guest waits for the host, the host sees the guest is ready', () => {
    const { unmount } = renderWithStore(<GameOver />, { room: { ...finished, players: [ALICE, { ...BOBBY, isReady: true }] } });
    expect(screen.getByText('Waiting for alice to restart')).toBeTruthy();

    unmount();
    renderWithStore(<GameOver />, { room: { ...finished, selfPlayerId: 'p1', players: [ALICE, { ...BOBBY, isReady: true }] } });
    expect(screen.getByText('bobby wants a rematch: press Restart')).toBeTruthy();
  });

  it('shows the score of a duel decided by points, yours first', () => {
    const game = { revision: 1, players: { p1: snapshotOf([], { score: 900 }), p2: snapshotOf([], { score: 1200 }) }, spectrums: {}, effects: {} };
    const won = renderWithStore(<GameOver />, { room: { ...finished, winnerPlayerId: 'p2', finishReason: 'score' }, game });
    expect(screen.getByRole('heading').textContent).toBe('You win');
    expect(screen.getByText('1200 to 900')).toBeTruthy();

    won.unmount();
    const lost = renderWithStore(<GameOver />, { room: { ...finished, selfPlayerId: 'p1', winnerPlayerId: 'p2', finishReason: 'score' }, game });
    expect(screen.getByRole('heading').textContent).toBe('You lose');
    expect(screen.getByText('900 to 1200')).toBeTruthy();

    lost.unmount();
    renderWithStore(<GameOver />, { room: { ...finished, finishReason: 'score' }, game: { ...game, players: { p1: snapshotOf([], { score: 500 }), p2: snapshotOf([], { score: 500 }) } } });
    expect(screen.getByRole('heading').textContent).toBe('Draw');
    expect(screen.getByText('Same score: 500 to 500')).toBeTruthy();
  });

  it('calls a draw when both players are out on the same tick', () => {
    renderWithStore(<GameOver />, { room: finished });

    expect(screen.getByRole('heading').textContent).toBe('Draw');
    expect(screen.getByText('Both players topped out at once')).toBeTruthy();
  });

  it('ends a solo game or a lone player without a winner', () => {
    const { unmount } = renderWithStore(<GameOver />, { room: { ...finished, mode: 'solo', players: [ALICE] } });

    expect(screen.getByRole('heading').textContent).toBe('Game over');
    expect(screen.getByText('Your stack reached the top')).toBeTruthy();

    unmount();
    renderWithStore(<GameOver />, { room: { ...finished, players: [ALICE] } });

    expect(screen.getByRole('heading').textContent).toBe('Game over');
  });
});

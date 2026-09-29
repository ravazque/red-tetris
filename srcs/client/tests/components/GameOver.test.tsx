import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { GameOver } from '../../src/components/GameOver.tsx';
import { ALICE, roomOf } from '../helpers/room.ts';
import { renderWithStore } from '../helpers/render.tsx';

const finished = roomOf({ phase: 'finished' });

describe('GameOver', () => {
  it('stays hidden until the round is over', () => {
    renderWithStore(<GameOver />, { room: roomOf({ phase: 'running' }) });

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('congratulates the winner, who can restart as host', () => {
    renderWithStore(<GameOver />, { room: { ...finished, selfPlayerId: 'p1', winnerPlayerId: 'p1' } });

    expect(screen.getByRole('heading').textContent).toBe('You win');
    expect(screen.getByText('bobby topped out')).toBeTruthy();
    expect(screen.getByText('Press Restart to play again')).toBeTruthy();
  });

  it('explains a win by forfeit', () => {
    const won = { ...finished, selfPlayerId: 'p1', winnerPlayerId: 'p1' };
    const { unmount } = renderWithStore(<GameOver />, { room: { ...won, finishReason: 'left' } });

    expect(screen.getByText('bobby left the game')).toBeTruthy();

    unmount();
    renderWithStore(<GameOver />, { room: { ...won, finishReason: 'timeout', players: [ALICE] } });

    expect(screen.getByText('Your rival did not reconnect in time')).toBeTruthy();
  });

  it('names the winner to the loser, who waits for the host', () => {
    renderWithStore(<GameOver />, { room: { ...finished, winnerPlayerId: 'p1' } });

    expect(screen.getByRole('heading').textContent).toBe('You lose');
    expect(screen.getByText('alice wins')).toBeTruthy();
    expect(screen.getByText('Waiting for the host to restart')).toBeTruthy();
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

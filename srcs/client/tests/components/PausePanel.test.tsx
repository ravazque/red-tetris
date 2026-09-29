import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { gameResumed } from '../../src/app/actions.ts';
import { PausePanel } from '../../src/components/PausePanel.tsx';
import { roomOf } from '../helpers/room.ts';
import { renderWithStore } from '../helpers/render.tsx';

const paused = roomOf({ phase: 'running', pause: { playerId: 'p1', graceMs: 15000, revision: 3 } });

describe('PausePanel', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('stays hidden while the game runs and the socket is up', () => {
    renderWithStore(<PausePanel />, { room: roomOf({ phase: 'running' }) });

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('names the missing player and counts down the grace period', () => {
    vi.useFakeTimers();
    const { store } = renderWithStore(<PausePanel />, { room: paused });

    expect(screen.getByRole('heading').textContent).toBe('Paused');
    expect(screen.getByText('Waiting for alice to reconnect')).toBeTruthy();
    expect(screen.getByText('0:15')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(screen.getByText('0:12')).toBeTruthy();

    act(() => {
      store.dispatch(gameResumed({ roomId: 'room1', revision: 4 }));
    });

    expect(screen.queryByRole('status')).toBeNull();
  });

  it('never counts below zero and falls back when the player is gone', () => {
    vi.useFakeTimers();
    renderWithStore(<PausePanel />, { room: { ...paused, pause: { playerId: 'p9', graceMs: 90000, revision: 3 } } });

    expect(screen.getByText('1:30')).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(95000);
    });

    expect(screen.getByText('Waiting for your rival to reconnect')).toBeTruthy();
    expect(screen.getByText('0:00')).toBeTruthy();
  });

  it('tells the local player when their own connection drops', () => {
    renderWithStore(<PausePanel />, { room: paused, connection: { online: false } });

    expect(screen.getByRole('heading').textContent).toBe('Connection lost');
    expect(screen.getByText('Reconnecting…')).toBeTruthy();
    expect(screen.queryByText(/\d:\d\d/)).toBeNull();
  });
});

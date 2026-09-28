import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomPanel } from '../../src/components/RoomPanel.tsx';
import { restartRequested, startRequested } from '../../src/app/actions.ts';
import type { RoomState } from '../../src/room/reducer.ts';
import { renderWithStore } from '../helpers/render.tsx';

const room = (overrides: Partial<RoomState>): RoomState => ({
  roomId: 'room1',
  phase: null,
  selfPlayerId: null,
  hostPlayerId: null,
  players: [],
  winnerPlayerId: null,
  revision: -1,
  error: null,
  ...overrides,
});

const inRoom = room({
  phase: 'waiting',
  selfPlayerId: 'p2',
  hostPlayerId: 'p1',
  revision: 2,
  players: [
    { playerId: 'p1', name: 'alice', isHost: true, isAlive: true },
    { playerId: 'p2', name: 'bob', isHost: false, isAlive: true },
  ],
});

describe('RoomPanel', () => {
  it('waits for the server before the first room:state', () => {
    renderWithStore(<RoomPanel />, { room: room({}) });

    expect(screen.getByText('Waiting for the server…')).toBeTruthy();
  });

  it('lists the players with the host badge and the local player', () => {
    renderWithStore(<RoomPanel />, { room: inRoom });
    const [alice, bob] = screen.getAllByRole('listitem');

    expect(screen.getByText('Waiting for the host to start')).toBeTruthy();
    expect(alice?.textContent).toBe('alice♛ host');
    expect(bob?.textContent).toBe('bobyou');
  });

  it('explains known room errors', () => {
    renderWithStore(<RoomPanel />, {
      room: room({ error: { roomId: 'room1', event: 'room:join', code: 'ROOM_FULL', message: 'Room is full' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Room is full (2 players max)');
    expect(screen.queryByText('Waiting for the server…')).toBeNull();
  });

  it('falls back to the server message for other errors', () => {
    renderWithStore(<RoomPanel />, {
      room: { ...inRoom, error: { roomId: 'room1', event: 'room:start', code: 'UNAUTHORIZED', message: 'Only the host' } },
    });

    expect(screen.getByRole('alert').textContent).toBe('Only the host');
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('lets only the host start a waiting room', () => {
    const { unmount } = renderWithStore(<RoomPanel />, { room: inRoom });

    expect(screen.queryByRole('button')).toBeNull();

    unmount();
    const { actions } = renderWithStore(<RoomPanel />, { room: { ...inRoom, selfPlayerId: 'p1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(actions).toContainEqual(startRequested({ roomId: 'room1' }));
  });

  it('shows the winner and lets the host restart a finished room', () => {
    const { actions } = renderWithStore(<RoomPanel />, {
      room: { ...inRoom, phase: 'finished', selfPlayerId: 'p1', winnerPlayerId: 'p2' },
    });

    expect(screen.getByText('bob wins')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(actions).toContainEqual(restartRequested({ roomId: 'room1' }));
  });

  it('shows no winner and no host buttons while running', () => {
    renderWithStore(<RoomPanel />, { room: { ...inRoom, phase: 'running', selfPlayerId: 'p1' } });

    expect(screen.getByText('Game running')).toBeTruthy();
    expect(screen.queryByText(/wins/)).toBeNull();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { restartRequested, startRequested } from '../../src/app/actions.ts';
import { RoomPanel } from '../../src/components/RoomPanel.tsx';
import { ALICE, roomOf } from '../helpers/room.ts';
import { renderWithStore } from '../helpers/render.tsx';

describe('RoomPanel', () => {
  it('waits for the server before the first room:state', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ phase: null, players: [], selfPlayerId: null, hostPlayerId: null }) });

    expect(screen.getByText('Waiting for the server…')).toBeTruthy();
  });

  it('shows the mode and the phase, but not the room code', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'pontrix' }) });

    expect(screen.queryByText('room1')).toBeNull();
    expect(screen.getByText('Pon-Trix')).toBeTruthy();
    expect(screen.getByText('Pon-Trix').parentElement?.className).toMatch(/pontrix/);
    expect(screen.getByText('Waiting for the host to start')).toBeTruthy();
  });

  it('explains known room errors instead of the phase', () => {
    renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:join', code: 'ROOM_FULL', message: 'Room is full' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Room is full (2 players max)');
    expect(screen.queryByText('Waiting for the host to start')).toBeNull();
  });

  it('falls back to the server message for other errors', () => {
    renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:start', code: 'UNAUTHORIZED', message: 'Only the host' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Only the host');
  });

  it('speaks of room codes in the INVALID_ROOM error', () => {
    renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:join', code: 'INVALID_ROOM', message: 'Invalid room' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Invalid room code');
  });

  it('explains the room errors added with the modes', () => {
    const { unmount } = renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: null, event: 'room:join', code: 'ROOM_NOT_FOUND', message: 'Room not found' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('No room with that code');

    unmount();
    renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:start', code: 'NOT_ENOUGH_PLAYERS', message: 'Two players needed' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Pon-Trix needs 2 players to start');
  });

  it('lets only the host start a waiting room', () => {
    const { unmount } = renderWithStore(<RoomPanel />, { room: roomOf() });

    expect(screen.queryByRole('button')).toBeNull();

    unmount();
    const { actions } = renderWithStore(<RoomPanel />, { room: roomOf({ selfPlayerId: 'p1', players: [ALICE] }) });
    expect(screen.getByText('Start when ready')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(actions).toContainEqual(startRequested({ roomId: 'room1' }));
  });

  it('keeps Pon-Trix from starting with a single player', () => {
    const { unmount } = renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'pontrix', selfPlayerId: 'p1', players: [ALICE] }) });

    expect((screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Needs 2 players to start')).toBeTruthy();

    unmount();
    renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'pontrix', selfPlayerId: 'p1' }) });

    expect((screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('lets the host restart a finished room', () => {
    const { actions } = renderWithStore(<RoomPanel />, { room: roomOf({ phase: 'finished', selfPlayerId: 'p1' }) });

    expect(screen.getByText('Round over')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));

    expect(actions).toContainEqual(restartRequested({ roomId: 'room1' }));
  });

  it('shows no host buttons while running', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ phase: 'running', selfPlayerId: 'p1' }) });

    expect(screen.getByText('Game running')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { restartRequested, startRequested } from '../../src/app/actions.ts';
import { RoomPanel } from '../../src/components/RoomPanel.tsx';
import { RULE_LABEL } from '../../src/room/modes.ts';
import { ALICE, BOBBY, roomOf, snapshotOf } from '../helpers/room.ts';
import { renderWithStore } from '../helpers/render.tsx';

describe('RoomPanel', () => {
  it('waits for the server before the first room:state', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ phase: null, players: [], selfPlayerId: null, hostPlayerId: null }) });

    expect(screen.getByText('Waiting for the server…')).toBeTruthy();
  });

  it('shows the mode, not the room code, and waits for a rival without any button', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'pontrix', players: [BOBBY] }) });

    expect(screen.queryByText('room1')).toBeNull();
    expect(screen.getByText('Pon-Trix').parentElement?.className).toMatch(/pontrix/);
    expect(screen.getByText('Waiting for a rival')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('explains room command errors instead of the status', () => {
    const { unmount } = renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:start', code: 'NOT_ENOUGH_PLAYERS', message: 'Two players needed' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Two players are needed to start');
    expect(screen.queryByText('Press Start when you are ready')).toBeNull();

    unmount();
    renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:start', code: 'UNAUTHORIZED', message: 'Socket is not a member' } }),
    });
    expect(screen.getByRole('alert').textContent).toBe('Only a player of this room can do that');
  });

  it('falls back to the server message for other errors', () => {
    renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:restart', code: 'INTERNAL_ERROR', message: 'Unexpected lobby error' } }),
    });

    expect(screen.getByRole('alert').textContent).toBe('Unexpected lobby error');
  });

  it('leaves join refusals to the home screen and keeps input races silent', () => {
    const { unmount } = renderWithStore(<RoomPanel />, {
      room: roomOf({ error: { roomId: 'room1', event: 'room:join', code: 'ROOM_FULL', message: 'Room is full' } }),
    });
    expect(screen.queryByRole('alert')).toBeNull();

    unmount();
    renderWithStore(<RoomPanel />, {
      room: roomOf({ phase: 'finished', error: { roomId: 'room1', event: 'game:input', code: 'INVALID_PHASE', message: 'No round is running' } }),
    });
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByText(/Round over/)).toBeTruthy();
  });

  it('gives the guest a glowing Ready and the host a locked Start', () => {
    const guest = renderWithStore(<RoomPanel />, { room: roomOf() });
    expect(screen.getByText('Press Ready when you are ready')).toBeTruthy();
    const ready = screen.getByRole('button', { name: 'Ready' });
    expect(ready.className).toMatch(/beckon/);
    fireEvent.click(ready);
    expect(guest.actions).toContainEqual(startRequested({ roomId: 'room1' }));

    guest.unmount();
    renderWithStore(<RoomPanel />, { room: roomOf({ selfPlayerId: 'p1' }) });
    const start = screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement;
    expect(screen.getByText('Waiting for bobby to be ready')).toBeTruthy();
    expect(start.disabled).toBe(true);
    expect(start.className).not.toMatch(/beckon/);
  });

  it('unlocks the host\'s Start once the guest is ready, and stops the guest\'s glow', () => {
    const host = renderWithStore(<RoomPanel />, { room: roomOf({ selfPlayerId: 'p1', players: [ALICE, { ...BOBBY, isReady: true }] }) });
    const start = screen.getByRole('button', { name: 'Start' }) as HTMLButtonElement;
    expect(screen.getByText('bobby is ready: press Start')).toBeTruthy();
    expect(start.disabled).toBe(false);
    expect(start.className).toMatch(/beckon/);
    fireEvent.click(start);
    expect(host.actions).toContainEqual(startRequested({ roomId: 'room1' }));

    host.unmount();
    renderWithStore(<RoomPanel />, { room: roomOf({ players: [ALICE, { ...BOBBY, isReady: true }] }) });
    const ready = screen.getByRole('button', { name: 'Ready' }) as HTMLButtonElement;
    expect(screen.getByText('Waiting for alice to start')).toBeTruthy();
    expect(ready.disabled).toBe(true);
    expect(ready.className).not.toMatch(/beckon/);
  });

  it('works the same way for the rematch: guest Ready, host Restart', () => {
    const guest = renderWithStore(<RoomPanel />, { room: roomOf({ phase: 'finished' }) });
    expect(screen.getByText('Round over: press Ready for a rematch')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Ready' }));
    expect(guest.actions).toContainEqual(restartRequested({ roomId: 'room1' }));

    guest.unmount();
    const host = renderWithStore(<RoomPanel />, { room: roomOf({ phase: 'finished', selfPlayerId: 'p1', players: [ALICE, { ...BOBBY, isReady: true }] }) });
    expect(screen.getByText('bobby is ready: press Restart')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restart' }));
    expect(host.actions).toContainEqual(restartRequested({ roomId: 'room1' }));
  });

  it('tells a topped-out player to wait for the rival to finish', () => {
    renderWithStore(<RoomPanel />, {
      room: roomOf({ phase: 'running' }),
      game: { revision: 1, players: { p2: snapshotOf([], { isAlive: false }) }, spectrums: {}, effects: {} },
    });

    expect(screen.getByText('Waiting for alice to finish')).toBeTruthy();
  });

  it('shows the versus rule next to the mode', () => {
    const { unmount } = renderWithStore(<RoomPanel />, { room: roomOf({ rule: 'score' }) });
    expect(screen.getByText(RULE_LABEL.score)).toBeTruthy();

    unmount();
    renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'pontrix', rule: 'score' }) });
    expect(screen.queryByText(RULE_LABEL.score)).toBeNull();
  });

  it('says the rival is reconnecting while its seat is held', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ players: [{ ...ALICE, isConnected: false }, BOBBY] }) });

    expect(screen.getByText('Waiting for alice to reconnect')).toBeTruthy();
  });

  it('shows a closed room with no button at all', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ phase: 'finished', players: [BOBBY], closed: { playerName: 'alice', reason: 'left' } }) });

    expect(screen.getByText('Room closed')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('never shows Start in solo, which starts by itself', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'solo', players: [BOBBY] }) });

    expect(screen.getByText('Starting…')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('lets a solo player restart alone', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ mode: 'solo', phase: 'finished', players: [BOBBY] }) });

    expect(screen.getByRole('button', { name: 'Restart' })).toBeTruthy();
  });

  it('shows no button while running', () => {
    renderWithStore(<RoomPanel />, { room: roomOf({ phase: 'running' }) });

    expect(screen.getByText('Game running')).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

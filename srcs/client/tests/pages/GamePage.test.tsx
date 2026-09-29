import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { RoomMode } from '../../../shared/constants.ts';
import type { RoomStatePayload } from '../../../shared/types.ts';
import { gameFinished, gamePaused, gameStarted, joinRequested, roomStateReceived, startRequested } from '../../src/app/actions.ts';
import { WAITING_TEXT } from '../../src/texts.ts';
import { renderApp } from '../helpers/render.tsx';
import { ALICE, BOBBY } from '../helpers/room.ts';

const roomState = (selfPlayerId: string, players = [ALICE], mode: RoomMode = 'versus'): RoomStatePayload => ({
  roomId: 'room1',
  revision: 1,
  phase: 'waiting',
  mode,
  selfPlayerId,
  hostPlayerId: 'p1',
  players,
});

describe('GamePage', () => {
  it('shows the room code from the URL in the invite and the player on its field', () => {
    renderApp('/room1/alice');

    expect(screen.getByTestId('piece-rain')).toBeTruthy();

    expect(screen.getByText('room1')).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText('you')).toBeTruthy();
  });

  it('requests the join on mount, as versus by default, and the leave on unmount', () => {
    const { store, actions, unmount } = renderApp('/room1/alice');

    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'versus' }));
    expect(store.getState().room.roomId).toBe('room1');
    expect(screen.getByText('Waiting for the server…')).toBeTruthy();

    unmount();

    expect(store.getState().room.roomId).toBeNull();
  });

  it('lays out a versus room with a free seat and the invite link until the rival arrives', () => {
    const { store } = renderApp('/room1/alice');

    expect(screen.getAllByTestId('board')).toHaveLength(2);
    expect(screen.getByText(WAITING_TEXT.versus.panel)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy link' }).getAttribute('title')).toBe(`${window.location.origin}/room1`);

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY])));
    });

    expect(screen.getByText('bobby')).toBeTruthy();
    expect(screen.queryByTestId('invite-lobby')).toBeNull();
  });

  it('drops the invite for good once the first round starts', () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1')));
    });

    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();

    act(() => {
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1'] }));
    });

    expect(screen.queryByTestId('invite-lobby')).toBeNull();
    expect(screen.getAllByTestId('board')).toHaveLength(1);

    act(() => {
      store.dispatch(gameFinished({ roomId: 'room1', revision: 3, winnerPlayerId: null }));
    });

    expect(screen.queryByTestId('invite-lobby')).toBeNull();
  });

  it('keeps the invite away when the rival drops out mid-game', () => {
    const { store } = renderApp({ pathname: '/room1/alice', state: { mode: 'pontrix' } });

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY], 'pontrix')));
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1', 'p2'] }));
      store.dispatch(roomStateReceived({ ...roomState('p1', [ALICE], 'pontrix'), revision: 3, phase: 'running' }));
    });

    expect(screen.getAllByTestId('board')).toHaveLength(2);
    expect(screen.queryByTestId('invite-lobby')).toBeNull();
    expect(screen.queryByText('Waiting for a rival…')).toBeNull();
  });

  it('covers the stage with the pause panel while a player reconnects', () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY])));
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1', 'p2'] }));
      store.dispatch(gamePaused({ roomId: 'room1', revision: 3, playerId: 'p2', graceMs: 15000 }));
    });

    expect(screen.getByRole('status').textContent).toContain('Waiting for bobby to reconnect');
    expect(screen.queryByTestId('invite-lobby')).toBeNull();
  });

  it('lays out a solo room with one board and no invite link', () => {
    renderApp({ pathname: '/room1/alice', state: { mode: 'solo' } });

    expect(screen.getAllByTestId('board')).toHaveLength(1);
    expect(screen.queryByTestId('invite-lobby')).toBeNull();
  });

  it('lays out a Pon-Trix room as the arena', () => {
    renderApp({ pathname: '/room1/alice', state: { mode: 'pontrix' } });

    expect(screen.getByTestId('pong-arena')).toBeTruthy();
    expect(screen.getByTestId('pong-ball')).toBeTruthy();
  });

  it('joins a solo room as solo and starts it once the player is the host', () => {
    const { store, actions } = renderApp({ pathname: '/room1/alice', state: { mode: 'solo' } });

    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'solo' }));
    expect(actions).not.toContainEqual(startRequested({ roomId: 'room1' }));

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE], 'solo')));
    });

    expect(actions.filter(({ type }) => type === startRequested.type)).toEqual([startRequested({ roomId: 'room1' })]);
  });

  it('never starts a room that is not solo', () => {
    const { store, actions } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1')));
    });

    expect(actions.map(({ type }) => type)).not.toContain(startRequested.type);
  });

  it('sends an invalid player name back to the join form of the room', () => {
    renderApp('/room1/two%20words');

    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('room1');
    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid name/);
  });

  it('sends an invalid room name back to the home screen', () => {
    const { store } = renderApp('/two%20words/alice');

    expect(screen.getByRole('button', { name: 'Play Solo' })).toBeTruthy();
    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid room code/);
    expect(store.getState().room.roomId).toBeNull();
  });

  it('leaves the room through the Leave link', () => {
    const { store } = renderApp('/room1/alice');

    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));

    expect(screen.getByRole('button', { name: 'Play Solo' })).toBeTruthy();
    expect(store.getState().room.roomId).toBeNull();
  });
});

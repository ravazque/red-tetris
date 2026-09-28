import { act, fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import type { RoomStatePayload } from '../../../shared/types.ts';
import { joinRequested, roomStateReceived, startRequested } from '../../src/app/actions.ts';
import { renderApp } from '../helpers/render.tsx';

const roomState = (selfPlayerId: string): RoomStatePayload => ({
  roomId: 'room1',
  revision: 1,
  phase: 'waiting',
  mode: 'versus',
  selfPlayerId,
  hostPlayerId: 'p1',
  players: [{ playerId: 'p1', name: 'alice', isAlive: true }],
});

describe('GamePage', () => {
  it('shows the room and player name from the URL', () => {
    renderApp('/room1/alice');

    expect(screen.getByRole('heading', { name: 'room1' })).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
  });

  it('renders an empty board', () => {
    const { container } = renderApp('/room1/alice');

    expect(container.querySelector('main')?.firstElementChild?.children).toHaveLength(BOARD_WIDTH * BOARD_HEIGHT);
  });

  it('requests the join on mount and the leave on unmount', () => {
    const { store, actions, unmount } = renderApp('/room1/alice');

    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice' }));
    expect(store.getState().room.roomId).toBe('room1');
    expect(screen.getByText('Waiting for the server…')).toBeTruthy();

    unmount();

    expect(store.getState().room.roomId).toBeNull();
  });

  it('shows the invite link unless the room is solo', () => {
    const { unmount } = renderApp('/room1/alice');

    expect(screen.getByText(`${window.location.origin}/room1`)).toBeTruthy();

    unmount();
    renderApp({ pathname: '/room1/alice', state: { mode: 'solo' } });

    expect(screen.queryByText(/Invite/)).toBeNull();
  });

  it('joins a solo room as solo and starts it once the player is the host', () => {
    const { store, actions } = renderApp({ pathname: '/room1/alice', state: { mode: 'solo' } });

    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'solo' }));
    expect(actions).not.toContainEqual(startRequested({ roomId: 'room1' }));

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1')));
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

    expect((screen.getByLabelText('Room') as HTMLInputElement).value).toBe('room1');
  });

  it('sends an invalid room name back to the home screen', () => {
    const { store } = renderApp('/two%20words/alice');

    expect(screen.getByRole('button', { name: 'Play solo' })).toBeTruthy();
    expect(store.getState().room.roomId).toBeNull();
  });

  it('leaves the room through the Leave link', () => {
    const { store } = renderApp('/room1/alice');

    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));

    expect(screen.getByRole('button', { name: 'Play solo' })).toBeTruthy();
    expect(store.getState().room.roomId).toBeNull();
  });
});

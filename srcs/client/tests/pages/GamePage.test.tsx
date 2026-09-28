import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import { renderApp } from '../helpers/render.tsx';

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
    const { store, unmount } = renderApp('/room1/alice');

    expect(store.getState().room.roomId).toBe('room1');
    expect(screen.getByText('Waiting for the server…')).toBeTruthy();

    unmount();

    expect(store.getState().room.roomId).toBeNull();
  });

  it('shows the invite link unless the room is solo', () => {
    const { unmount } = renderApp('/room1/alice');

    expect(screen.getByText(`${window.location.origin}/room1`)).toBeTruthy();

    unmount();
    renderApp({ pathname: '/room1/alice', state: { solo: true } });

    expect(screen.queryByText(/Invite/)).toBeNull();
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

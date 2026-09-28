import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../helpers/render.tsx';

const typeInto = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('HomePage', () => {
  it('offers solo, create and join on / and unknown URLs', () => {
    renderApp('/a/b/c');

    expect(screen.getByRole('heading', { name: 'Red Tetris' })).toBeTruthy();
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual([
      'Play solo',
      'Create room',
      'Join room',
    ]);
    expect(screen.queryByLabelText('Room')).toBeNull();
  });

  it('creates a room with a random name and shows the invite link', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('abcd1234-0000-4000-8000-000000000000');
    renderApp('/');

    typeInto('Player name', 'alice');
    click('Create room');

    expect(screen.getByRole('heading', { name: 'abcd1234' })).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText(`${window.location.origin}/abcd1234`)).toBeTruthy();
  });

  it('starts a solo room without the invite link', () => {
    renderApp('/');

    typeInto('Player name', 'alice');
    click('Play solo');

    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.queryByText(/Invite/)).toBeNull();
  });

  it('rejects an invalid player name and stays on the home screen', () => {
    renderApp('/');

    typeInto('Player name', 'two words');
    click('Create room');

    expect(screen.getByRole('alert').textContent).toMatch(/^Player name/);
    expect(screen.getByRole('button', { name: 'Create room' })).toBeTruthy();
  });

  it('joins the room typed in the join form', () => {
    renderApp('/');

    click('Join room');
    typeInto('Player name', 'bobby');
    typeInto('Room', 'room1');
    click('Join');

    expect(screen.getByRole('heading', { name: 'room1' })).toBeTruthy();
    expect(screen.getByText('bobby')).toBeTruthy();
  });

  it('validates the room name and goes back to the menu', () => {
    renderApp('/');

    click('Join room');
    typeInto('Player name', 'bobby');
    click('Join');

    expect(screen.getByRole('alert').textContent).toMatch(/^Room/);

    click('Back');

    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.getByRole('button', { name: 'Play solo' })).toBeTruthy();
  });

  it('opens the join form with the room of an invite link', () => {
    renderApp('/room1');

    expect((screen.getByLabelText('Room') as HTMLInputElement).value).toBe('room1');
    expect(screen.getByRole('button', { name: 'Join' })).toBeTruthy();
  });
});

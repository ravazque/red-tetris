import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../helpers/render.tsx';

const typeInto = (label: string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });

const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('HomePage', () => {
  it('offers the three modes and a join form on / and unknown URLs', () => {
    renderApp('/a/b/c');

    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Red Tetris');
    expect(screen.getByTestId('piece-rain')).toBeTruthy();
    expect(screen.getAllByRole('heading', { level: 2 }).map(({ textContent }) => textContent)).toEqual([
      'Solo',
      'Versus',
      'Pon-Trix',
    ]);
    expect(screen.getAllByRole('button').map((button) => button.getAttribute('aria-label') ?? button.textContent)).toEqual([
      'Play Solo',
      'Create Versus',
      'Create Pon-Trix',
      'Join',
    ]);
  });

  it('creates a versus room with a random name and shows the invite link', () => {
    vi.spyOn(crypto, 'randomUUID').mockReturnValueOnce('abcd1234-0000-4000-8000-000000000000');
    renderApp('/');

    typeInto('Player name', 'alice');
    click('Create Versus');

    expect(screen.getByText('abcd1234')).toBeTruthy();
    expect(screen.getByText('Versus')).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy link' }).getAttribute('title')).toBe(`${window.location.origin}/abcd1234`);
  });

  it('starts a solo room without the invite link', () => {
    renderApp('/');

    typeInto('Player name', 'alice');
    click('Play Solo');

    expect(screen.getByText('Solo')).toBeTruthy();
    expect(screen.queryByTestId('invite-lobby')).toBeNull();
  });

  it('creates a Pon-Trix room with the arena', () => {
    renderApp('/');

    typeInto('Player name', 'alice');
    click('Create Pon-Trix');

    expect(screen.getByText('Pon-Trix')).toBeTruthy();
    expect(screen.getByTestId('pong-arena')).toBeTruthy();
  });

  it('asks for a name before creating a room', () => {
    renderApp('/');

    click('Create Versus');

    expect(screen.getByRole('alert').textContent).toMatch(/^Enter your name/);
    expect(screen.getByLabelText('Player name').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByRole('button', { name: 'Create Versus' })).toBeTruthy();
  });

  it('rejects an invalid player name and stays on the home screen', () => {
    renderApp('/');

    typeInto('Player name', 'two words');
    click('Play Solo');

    expect(screen.getByRole('alert').textContent).toBe('Invalid name4 to 16 letters, digits, - or _');
    expect(screen.getByRole('button', { name: 'Play Solo' })).toBeTruthy();
  });

  it('joins the room typed in the join form', () => {
    renderApp('/');

    typeInto('Player name', 'bobby');
    typeInto('Room code', 'room1');
    click('Join');

    expect(screen.getByText('room1')).toBeTruthy();
    expect(screen.getByText('bobby')).toBeTruthy();
  });

  it('keeps Enter in the name field away from the join form', () => {
    renderApp('/');

    expect(screen.getByLabelText('Player name').closest('form')).toBeNull();
    expect(screen.getByLabelText('Room code').closest('form')).toBe(screen.getByRole('button', { name: 'Join' }).closest('form'));
  });

  it('validates the room code under the join form', () => {
    renderApp('/');

    typeInto('Player name', 'bobby');
    click('Join');

    expect(screen.getByRole('alert').textContent).toBe('Enter a room codeA code like 3f9a1c2e (4 to 16 letters, digits, - or _)');
    expect(screen.getByLabelText('Room code').getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByLabelText('Player name').getAttribute('aria-invalid')).toBe('false');

    typeInto('Room code', 'a/b');
    click('Join');

    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid room code/);
  });

  it('fills in the room of an invite link', () => {
    renderApp('/room1');

    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('room1');
  });

  it('keeps the player name after leaving a room, but not the room code', () => {
    renderApp('/');

    typeInto('Player name', 'bobby');
    typeInto('Room code', 'room1');
    click('Join');
    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));

    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('bobby');
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('');
    expect(document.activeElement).toBe(screen.getByLabelText('Room code'));
  });

  it('explains why a typed game URL was rejected', () => {
    const { unmount } = renderApp('/two%20words/alice');

    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid room code/);
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('two words');
    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('alice');

    unmount();
    renderApp('/room1/ab');

    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid name/);
    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('ab');
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('room1');
  });
});

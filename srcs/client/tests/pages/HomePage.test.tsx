import { fireEvent, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { joinRequested } from '../../src/app/actions.ts';
import { RULE_ABOUT, RULE_LABEL } from '../../src/room/modes.ts';
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
    fireEvent.click(within(screen.getByRole('dialog', { name: 'Versus' })).getByRole('button', { name: new RegExp(RULE_LABEL.survival) }));

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
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('rejects an invalid player name and stays on the home screen', () => {
    renderApp('/');

    typeInto('Player name', 'two words');
    click('Play Solo');

    expect(screen.getByRole('alert').textContent).toBe('Invalid name3 to 12 letters, digits, - or _');
    expect(screen.getByRole('button', { name: 'Play Solo' })).toBeTruthy();
  });

  it('joins the room typed in the join form, only if it exists (no mode)', () => {
    const { actions } = renderApp('/');

    typeInto('Player name', 'bobby');
    typeInto('Room code', 'room1');
    click('Join');

    expect(screen.getByText('room1')).toBeTruthy();
    expect(screen.getByText('bobby')).toBeTruthy();
    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'bobby' }));
  });

  it('opens a panel to pick the versus rule, and creates the room with it', () => {
    const { actions } = renderApp('/');
    typeInto('Player name', 'alice');
    click('Create Versus');

    const panel = screen.getByRole('dialog', { name: 'Versus' });
    expect(within(panel).getByText(RULE_ABOUT.survival)).toBeTruthy();
    expect(within(panel).getByText(RULE_ABOUT.score)).toBeTruthy();
    expect(document.activeElement).toBe(within(panel).getByRole('button', { name: new RegExp(RULE_LABEL.survival) }));
    fireEvent.click(within(panel).getByRole('button', { name: new RegExp(RULE_LABEL.score) }));

    expect(screen.queryByRole('dialog')).toBeNull();
    expect(actions.filter(joinRequested.match).at(-1)?.payload).toMatchObject({ playerName: 'alice', mode: 'versus', rule: 'score' });
  });

  it('closes the versus panel with Cancel, Escape or a click outside, without creating anything', () => {
    const { actions } = renderApp('/');
    typeInto('Player name', 'alice');

    click('Create Versus');
    click('Cancel');
    expect(screen.queryByRole('dialog')).toBeNull();

    click('Create Versus');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();

    click('Create Versus');
    fireEvent.click(screen.getByRole('dialog').parentElement as HTMLElement);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(actions.filter(joinRequested.match)).toEqual([]);
  });

  it('explains that a closed room takes nobody in', () => {
    renderApp({ pathname: '/', state: { player: 'bobby', room: 'room1', code: 'ROOM_CLOSED' } });

    expect(screen.getByRole('alert').textContent).toContain('Room closed');
    expect(screen.getByRole('alert').textContent).toContain('That game is over');
  });

  it('explains an unknown join refusal under the room code', () => {
    renderApp({ pathname: '/', state: { player: 'bobby', room: 'room1', code: 'INTERNAL_ERROR' } });

    expect(screen.getByRole('alert').textContent).toContain('Could not join');
    expect(screen.getByLabelText('Room code').getAttribute('aria-invalid')).toBe('true');
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

    expect(screen.getByRole('alert').textContent).toBe('Enter a room codeA code like 3f9a1c2e (3 to 12 letters, digits, - or _)');
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

  it('explains why an invite link was rejected, keeping the name typed before', () => {
    renderApp('/ab', { profile: { playerName: 'bobby' } });

    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid room code/);
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('ab');
    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('bobby');
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

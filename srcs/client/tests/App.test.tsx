import { screen } from '@testing-library/react';
import { MemoryRouter, useLocation, useNavigationType } from 'react-router';
import { describe, expect, it } from 'vitest';
import { App } from '../src/App.tsx';
import { joinRequested } from '../src/app/actions.ts';
import { renderWithStore } from './helpers/render.tsx';

// Shows where the router ended and how it got there (PUSH on a fresh entry, REPLACE after a redirect).
const Probe = () => {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="probe">{`${useNavigationType()} ${pathname}${search}${hash}`}</output>;
};

const visit = (entry: string | { pathname: string; state: unknown }) =>
  renderWithStore(
    <MemoryRouter initialEntries={[entry]}>
      <App />
      <Probe />
    </MemoryRouter>,
  );

const probe = () => screen.getByTestId('probe').textContent;

describe('App URLs', () => {
  it.each(['/a84283d0/ravazque/aaaaaaaaaaaa', '/a/b/c/d/e', '//a84283d0', '/a84283d0//ravazque'])('replaces the impossible %s with a clean home screen', (path) => {
    visit(path);

    expect(probe()).toBe('REPLACE /');
    expect(screen.queryByRole('alert')).toBeNull();
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('');
  });

  it('replaces a game URL with a name too long by / with the name to fix', () => {
    const { actions } = visit('/a84283d0/ravazqueeeeeeeeeeeeeeeeeeeeeeeeeee');

    expect(probe()).toBe('REPLACE /');
    expect(screen.getByRole('alert').textContent).toMatch(/^Invalid name/);
    expect((screen.getByLabelText('Player name') as HTMLInputElement).value).toBe('ravazqueeeeeeeeeeeeeeeeeeeeeeeeeee');
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('a84283d0');
    expect(actions.some(({ type }) => type === joinRequested.type)).toBe(false);
  });

  it('cleans a playable URL and keeps the mode it was opened with', () => {
    const { actions } = visit({ pathname: '/room1/alice/', state: { mode: 'solo' } });

    expect(probe()).toBe('REPLACE /room1/alice');
    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'solo' }));
  });

  it('drops the query and the hash of an invite link', () => {
    visit('/room1/?x=1#top');

    expect(probe()).toBe('REPLACE /room1');
    expect((screen.getByLabelText('Room code') as HTMLInputElement).value).toBe('room1');
  });

  it('leaves clean URLs alone', () => {
    visit('/room1/alice');

    expect(probe()).toBe('POP /room1/alice');
    expect(screen.getAllByTestId('board')).toHaveLength(2);
  });
});

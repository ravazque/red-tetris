import { act, fireEvent, screen, within } from '@testing-library/react';
import { StrictMode } from 'react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { RoomMode } from '../../../shared/constants.ts';
import type { RoomStatePayload } from '../../../shared/types.ts';
import {
  connectionChanged,
  gameFinished,
  gamePaused,
  gameStarted,
  gameStateReceived,
  inputRequested,
  joinRequested,
  leaveRequested,
  roomErrorReceived,
  roomStateReceived,
  startRequested,
} from '../../src/app/actions.ts';
import { App } from '../../src/App.tsx';
import { WAITING_TEXT } from '../../src/texts.ts';
import { renderApp, renderWithStore } from '../helpers/render.tsx';
import { ALICE, BOBBY, snapshotOf } from '../helpers/room.ts';

const roomState = (selfPlayerId: string, players = [ALICE], mode: RoomMode = 'versus'): RoomStatePayload => ({
  roomId: 'room1',
  revision: 1,
  phase: 'waiting',
  mode,
  rule: 'survival',
  selfPlayerId,
  hostPlayerId: 'p1',
  players,
  closed: null,
});

// The leave waits a tick, so a StrictMode re-run can keep the seat.
const tick = () => act(() => new Promise((resolve) => setTimeout(resolve)));

describe('GamePage', () => {
  it('shows the room code from the URL in the invite and the player on its field', () => {
    renderApp('/room1/alice');

    expect(screen.getByTestId('piece-rain')).toBeTruthy();

    expect(screen.getByText('room1')).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
    expect(screen.getByText('you')).toBeTruthy();
  });

  it('requests the join on mount, as versus by default, and the leave a tick after unmount', async () => {
    const { store, actions, unmount } = renderApp('/room1/alice');

    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'versus' }));
    expect(store.getState().room.roomId).toBe('room1');
    expect(screen.getByText('Waiting for the server…')).toBeTruthy();

    unmount();
    await tick();

    expect(store.getState().room.roomId).toBeNull();
  });

  it('sends a single join and no leave when StrictMode re-runs the effects', async () => {
    const { actions } = renderWithStore(
      <StrictMode>
        <MemoryRouter initialEntries={['/room1/alice']}>
          <App />
        </MemoryRouter>
      </StrictMode>,
    );
    await tick();

    expect(actions.filter(joinRequested.match)).toHaveLength(1);
    expect(actions.filter(leaveRequested.match)).toEqual([]);
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

  it('hides the invite while a round runs and after it ends', () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1')));
    });

    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();

    act(() => {
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1'] }));
    });

    expect(screen.queryByTestId('invite-lobby')).toBeNull();
    expect(screen.getAllByTestId('board')).toHaveLength(2);

    act(() => {
      store.dispatch(gameFinished({ roomId: 'room1', revision: 3, winnerPlayerId: null }));
    });

    expect(screen.queryByTestId('invite-lobby')).toBeNull();
  });

  it('gives the win and closes the room when the rival does not come back mid-game', async () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY])));
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1', 'p2'] }));
      store.dispatch(gameFinished({ roomId: 'room1', revision: 3, winnerPlayerId: 'p1', reason: 'timeout' }));
      store.dispatch(roomStateReceived({ ...roomState('p1', [ALICE]), revision: 3, phase: 'finished', closed: { playerName: 'bobby', reason: 'timeout' } }));
    });

    const card = screen.getByRole('dialog', { name: 'Round over' });
    expect(within(card).getByRole('heading').textContent).toBe('You win');
    expect(within(card).getByText('bobby did not reconnect in time')).toBeTruthy();
    expect(within(card).getByText('This room is closed')).toBeTruthy();
    expect(screen.getByText('Room closed')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Restart|Start/ })).toBeNull();
    expect(screen.queryByTestId('invite-lobby')).toBeNull();

    fireEvent.click(within(card).getByRole('link', { name: 'Back to menu' }));
    await tick();
    expect(screen.getByRole('button', { name: 'Play Solo' })).toBeTruthy();
    expect(store.getState().room.roomId).toBeNull();
  });

  it('shows a closed room card when the rival leaves before any round', () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY])));
      store.dispatch(roomStateReceived({ ...roomState('p1', [ALICE]), revision: 2, phase: 'finished', closed: { playerName: 'bobby', reason: 'left' } }));
    });

    const card = screen.getByRole('dialog', { name: 'Round over' });
    expect(within(card).getByRole('heading').textContent).toBe('Room closed');
    expect(within(card).getByText('bobby left')).toBeTruthy();
    expect(within(card).getByRole('link', { name: 'Back to menu' })).toBeTruthy();
  });

  it('keeps the last result and names who left on the end-of-round screen', () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY])));
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1', 'p2'] }));
      store.dispatch(gameFinished({ roomId: 'room1', revision: 3, winnerPlayerId: 'p2', reason: 'topout' }));
      store.dispatch(roomStateReceived({ ...roomState('p1', [ALICE]), revision: 4, phase: 'finished', closed: { playerName: 'bobby', reason: 'left' } }));
    });

    const card = screen.getByRole('dialog', { name: 'Round over' });
    expect(within(card).getByRole('heading').textContent).toBe('You lose');
    expect(within(card).getByText('bobby wins')).toBeTruthy();
    expect(within(card).getByText('bobby left: this room is closed')).toBeTruthy();
  });

  it('takes a seat again after the socket reconnects', () => {
    const { store, actions } = renderApp('/room1/alice');
    const joins = () => actions.filter(joinRequested.match).length;
    expect(joins()).toBe(1);

    act(() => {
      store.dispatch(connectionChanged(false));
    });
    expect(joins()).toBe(1);
    act(() => {
      store.dispatch(connectionChanged(true));
    });

    expect(joins()).toBe(2);
    expect(actions.filter(joinRequested.match).at(-1)?.payload).toEqual({ roomId: 'room1', playerName: 'alice', mode: 'versus' });
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

  it('lays out a Pon-Trix room as the arena, with the invite over the whole stage', () => {
    renderApp({ pathname: '/room1/alice', state: { mode: 'pontrix' } });

    expect(screen.getByTestId('pong-arena')).toBeTruthy();
    expect(screen.getByTestId('pong-ball')).toBeTruthy();
    expect(screen.getByText(WAITING_TEXT.pontrix.panel)).toBeTruthy();
    expect(screen.getByTestId('pong-arena').contains(screen.getByTestId('invite-lobby'))).toBe(false);
  });

  it('puts the controls and the score beside a solo board, with the record', () => {
    renderApp({ pathname: '/room1/alice', state: { mode: 'solo' } });

    expect(within(screen.getByRole('region', { name: 'Controls' })).queryByText('Paddle')).toBeNull();
    expect(within(screen.getByRole('region', { name: 'Score' })).getByText('Best')).toBeTruthy();
  });

  it('keeps the versus layout, rival board and score included, when started alone', () => {
    const { store } = renderApp('/room1/alice');

    expect(screen.getByTestId('score-self')).toBeTruthy();
    expect(screen.getByTestId('score-rival')).toBeTruthy();

    act(() => {
      store.dispatch(roomStateReceived(roomState('p1')));
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1'] }));
    });

    expect(screen.getAllByTestId('board')).toHaveLength(2);
    expect(screen.getByTestId('score-rival')).toBeTruthy();
    expect(screen.queryByText('Best')).toBeNull();
  });

  it('adds the paddle keys and the goals in Pon-Trix', () => {
    renderApp({ pathname: '/room1/alice', state: { mode: 'pontrix' } });

    expect(within(screen.getByRole('region', { name: 'Controls' })).getByText('Paddle')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: 'Score' })).getAllByText('Goals')).toHaveLength(2);
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

  it('sends an invalid player name to the home screen with the room filled in', () => {
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

  it('leaves the room through the Leave link', async () => {
    const { store } = renderApp('/room1/alice');

    fireEvent.click(screen.getByRole('link', { name: 'Leave' }));
    await tick();

    expect(screen.getByRole('button', { name: 'Play Solo' })).toBeTruthy();
    expect(store.getState().room.roomId).toBeNull();
  });

  it('sends the chosen rule only for a versus room', () => {
    const { actions, unmount } = renderApp({ pathname: '/room1/alice', state: { mode: 'versus', rule: 'score' } });
    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'versus', rule: 'score' }));

    unmount();
    const pontrix = renderApp({ pathname: '/room2/alice', state: { mode: 'pontrix', rule: 'survival' } });
    expect(pontrix.actions).toContainEqual(joinRequested({ roomId: 'room2', playerName: 'alice', mode: 'pontrix' }));
  });

  it('joins without a mode when it comes from the home Join', () => {
    const { actions } = renderApp({ pathname: '/room1/alice', state: { join: true } });

    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice' }));
  });

  it.each([
    ['ROOM_FULL', 'Room is full', 'room'],
    ['ROOM_RUNNING', 'Game in progress', 'room'],
    ['ROOM_NOT_FOUND', 'Room not found', 'room'],
    ['INVALID_PLAYER', 'Name taken', 'player'],
  ] as const)('goes back home when the server refuses the join (%s)', (code, title, field) => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomErrorReceived({ roomId: 'room1', event: 'room:join', code, message: 'refused' }));
    });

    expect(screen.queryByTestId('board')).toBeNull();
    expect(screen.getByRole('alert').textContent).toContain(title);
    expect((screen.getByRole('textbox', { name: 'Player name' }) as HTMLInputElement).value).toBe('alice');
    expect((screen.getByRole('textbox', { name: 'Room code' }) as HTMLInputElement).value).toBe('room1');
    expect(screen.getByRole('textbox', { name: field === 'room' ? 'Room code' : 'Player name' }).getAttribute('aria-invalid')).toBe('true');
  });

  it('stays on the game screen for errors of other commands', () => {
    const { store } = renderApp('/room1/alice');

    act(() => {
      store.dispatch(roomErrorReceived({ roomId: 'room1', event: 'room:start', code: 'UNAUTHORIZED', message: 'Only the host' }));
    });

    expect(screen.getAllByTestId('board')).toHaveLength(2);
  });

  const running = (store: ReturnType<typeof renderApp>['store'], alive = true) =>
    act(() => {
      store.dispatch(roomStateReceived(roomState('p1', [ALICE, BOBBY])));
      store.dispatch(gameStarted({ roomId: 'room1', revision: 2, phase: 'running', playerIds: ['p1', 'p2'] }));
      store.dispatch(gameStateReceived({ roomId: 'room1', revision: 2, playerId: 'p1', state: snapshotOf([], { isAlive: alive }) }));
    });

  it('turns keys into numbered inputs while your round runs', () => {
    const { store, actions } = renderApp('/room1/alice');
    fireEvent.keyDown(window, { code: 'ArrowLeft' });
    expect(actions.filter(inputRequested.match)).toEqual([]);

    running(store);
    fireEvent.keyDown(window, { code: 'ArrowLeft' });
    fireEvent.keyDown(window, { code: 'ArrowLeft', repeat: true });
    fireEvent.keyDown(window, { code: 'ArrowUp' });
    fireEvent.keyDown(window, { code: 'ArrowUp', repeat: true });
    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.keyUp(window, { code: 'Space' });
    fireEvent.keyDown(window, { code: 'KeyQ' });

    expect(actions.filter(inputRequested.match).map(({ payload }) => payload)).toEqual([
      { roomId: 'room1', action: 'move_left', sequence: 1 },
      { roomId: 'room1', action: 'move_left', sequence: 2 },
      { roomId: 'room1', action: 'rotate', sequence: 3 },
      { roomId: 'room1', action: 'hard_drop', sequence: 4 },
    ]);
  });

  it('ignores keys once you are out', () => {
    const { store, actions } = renderApp('/room1/alice');
    running(store, false);

    fireEvent.keyDown(window, { code: 'ArrowDown' });

    expect(actions.filter(inputRequested.match)).toEqual([]);
  });

  it('crowns the player ahead on points, nobody on a tie, never in solo', () => {
    const { store, unmount } = renderApp('/room1/alice');
    running(store);
    const crowns = () => screen.queryAllByTitle('Ahead on points');
    const score = (playerId: string, points: number) =>
      act(() => {
        store.dispatch(gameStateReceived({ roomId: 'room1', revision: 2, playerId, state: snapshotOf([], { score: points }) }));
      });

    expect(crowns()).toHaveLength(0);
    score('p2', 300);
    expect(crowns()).toHaveLength(1);
    expect(screen.getByText('bobby').parentElement?.textContent).toContain('♛');
    score('p1', 300);
    expect(crowns()).toHaveLength(0);
    score('p1', 800);
    expect(screen.getByText('alice').parentElement?.textContent).toContain('♛');

    unmount();
    const solo = renderApp({ pathname: '/room2/alice', state: { mode: 'solo' } });
    act(() => {
      solo.store.dispatch(roomStateReceived({ ...roomState('p1', [ALICE], 'solo'), roomId: 'room2' }));
      solo.store.dispatch(gameStateReceived({ roomId: 'room2', revision: 2, playerId: 'p1', state: snapshotOf([], { score: 500 }) }));
    });
    expect(crowns()).toHaveLength(0);
  });
});

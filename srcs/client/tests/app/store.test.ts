import { io } from 'socket.io-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  connectionChanged,
  gameFinished,
  gamePaused,
  gameResumed,
  gameStarted,
  gameStateReceived,
  hostChanged,
  inputRequested,
  joinRequested,
  leaveRequested,
  pongStateReceived,
  paddleInputRequested,
  restartRequested,
  roomErrorReceived,
  roomStateReceived,
  spectrumReceived,
  startRequested,
} from '../../src/app/actions.ts';
import { socketMiddleware } from '../../src/app/socketMiddleware.ts';
import { store } from '../../src/app/store.ts';

type Listener = (payload?: unknown) => void;

const socketTestDouble = vi.hoisted(() => {
  const listeners = new Map<string, Listener>();
  const socket = {
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, listener);
      return socket;
    }),
    emit: vi.fn(),
  };
  return { listeners, socket, io: vi.fn(() => socket) };
});

// The middleware opens the socket on store creation; keep tests off the network.
vi.mock('socket.io-client', () => ({ io: socketTestDouble.io }));

describe('socketMiddleware', () => {
  beforeEach(() => {
    socketTestDouble.io.mockClear();
    socketTestDouble.socket.on.mockClear();
    socketTestDouble.socket.emit.mockClear();
    socketTestDouble.listeners.clear();
  });

  const createMiddleware = () => {
    const dispatch = vi.fn();
    const next = vi.fn((action: unknown) => action);
    const invoke = socketMiddleware({ dispatch, getState: vi.fn() })(next);
    return { dispatch, invoke, next };
  };

  it('opens one socket and passes unknown actions through', () => {
    const { invoke, next } = createMiddleware();
    const action = { type: 'test/unknown' };

    invoke(action);

    expect(io).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(action);
  });

  it.each([
    [joinRequested({ roomId: 'room-1', playerName: 'Alice', mode: 'versus' }), 'room:join'],
    [leaveRequested({ roomId: 'room-1' }), 'room:leave'],
    [startRequested({ roomId: 'room-1' }), 'room:start'],
    [restartRequested({ roomId: 'room-1' }), 'room:restart'],
    [inputRequested({ roomId: 'room-1', action: 'rotate', sequence: 1 }), 'game:input'],
    [paddleInputRequested({ roomId: 'room-1', direction: -1 }), 'pong:input'],
  ])('emits %s for the corresponding request action', (action, event) => {
    const { invoke } = createMiddleware();

    invoke(action);

    expect(socketTestDouble.socket.emit).toHaveBeenCalledWith(event, action.payload);
  });

  it('dispatches connection changes and incoming room events', () => {
    const { dispatch } = createMiddleware();
    const roomState = {
      roomId: 'room-1',
      revision: 1,
      phase: 'waiting' as const,
      mode: 'versus' as const,
      rule: 'survival' as const,
      selfPlayerId: 'player-1',
      hostPlayerId: 'player-1',
      players: [{ playerId: 'player-1', name: 'Alice', isAlive: true, isReady: false, isConnected: true }],
      closed: null,
    };

    socketTestDouble.listeners.get('connect')?.();
    socketTestDouble.listeners.get('disconnect')?.();
    socketTestDouble.listeners.get('room:state')?.(roomState);

    expect(dispatch).toHaveBeenCalledWith(connectionChanged(true));
    expect(dispatch).toHaveBeenCalledWith(connectionChanged(false));
    expect(dispatch).toHaveBeenCalledWith(roomStateReceived(roomState));
  });

  it('dispatches all server game and room events', () => {
    const { dispatch } = createMiddleware();
    const envelope = { roomId: 'room-1', revision: 2 };
    const gameStartedPayload = { ...envelope, phase: 'running' as const, playerIds: ['player-1'] };
    const gameFinishedPayload = { ...envelope, winnerPlayerId: 'player-1' };
    const pausedPayload = { ...envelope, playerId: 'player-2', graceMs: 15_000 };
    const gameStatePayload = { ...envelope, playerId: 'player-1', state: { board: [], active: null, next: null, isAlive: true, lastSequence: 0, score: 0, lines: 0 } };
    const spectrumPayload = { ...envelope, playerId: 'player-2', spectrum: [1, 2] };
    const pongPayload = { ...envelope, state: { ball: { x: 1, y: 2 }, paddles: {}, goals: {}, serving: false, vanish: null } };
    const errorPayload = { roomId: 'room-1', event: 'room:join' as const, code: 'ROOM_FULL' as const, message: 'full' };

    socketTestDouble.listeners.get('room:error')?.(errorPayload);
    socketTestDouble.listeners.get('host:changed')?.({ ...envelope, playerId: 'player-1', playerName: 'Alice' });
    socketTestDouble.listeners.get('game:started')?.(gameStartedPayload);
    socketTestDouble.listeners.get('game:finished')?.(gameFinishedPayload);
    socketTestDouble.listeners.get('game:paused')?.(pausedPayload);
    socketTestDouble.listeners.get('game:resumed')?.(envelope);
    socketTestDouble.listeners.get('game:state')?.(gameStatePayload);
    socketTestDouble.listeners.get('game:spectrum')?.(spectrumPayload);
    socketTestDouble.listeners.get('pong:state')?.(pongPayload);

    expect(dispatch).toHaveBeenCalledWith(roomErrorReceived(errorPayload));
    expect(dispatch).toHaveBeenCalledWith(hostChanged({ ...envelope, playerId: 'player-1', playerName: 'Alice' }));
    expect(dispatch).toHaveBeenCalledWith(gameStarted(gameStartedPayload));
    expect(dispatch).toHaveBeenCalledWith(gameFinished(gameFinishedPayload));
    expect(dispatch).toHaveBeenCalledWith(gamePaused(pausedPayload));
    expect(dispatch).toHaveBeenCalledWith(gameResumed(envelope));
    expect(dispatch).toHaveBeenCalledWith(gameStateReceived(gameStatePayload));
    expect(dispatch).toHaveBeenCalledWith(spectrumReceived(spectrumPayload));
    expect(dispatch).toHaveBeenCalledWith(pongStateReceived(pongPayload));
  });
});

describe('store', () => {
  it('exposes the connection, game, pong, profile and room slices', () => {
    expect(store.getState()).toHaveProperty('connection');
    expect(store.getState()).toHaveProperty('game');
    expect(store.getState()).toHaveProperty('pong');
    expect(store.getState()).toHaveProperty('profile');
    expect(store.getState()).toHaveProperty('room');
  });

  it('dispatches through the middleware chain', () => {
    const action = { type: 'test/unknown' };

    expect(store.dispatch(action)).toEqual(action);
  });
});

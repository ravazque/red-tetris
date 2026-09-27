import { io } from 'socket.io-client';
import { describe, expect, it, vi } from 'vitest';
import { socketMiddleware } from '../../src/app/socketMiddleware.ts';
import { store } from '../../src/app/store.ts';

// The middleware opens the socket on store creation; keep tests off the network.
vi.mock('socket.io-client', () => ({ io: vi.fn(() => ({ on: vi.fn() })) }));

describe('socketMiddleware', () => {
  it('opens one socket per store and passes actions on', () => {
    const next = vi.fn();
    const action = { type: 'test/unknown' };

    socketMiddleware({ dispatch: vi.fn(), getState: vi.fn() })(next)(action);

    expect(io).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(action);
  });
});

describe('store', () => {
  it('exposes the game slice', () => {
    expect(store.getState()).toHaveProperty('game');
  });

  it('dispatches through the middleware chain', () => {
    const action = { type: 'test/unknown' };

    expect(store.dispatch(action)).toEqual(action);
  });
});

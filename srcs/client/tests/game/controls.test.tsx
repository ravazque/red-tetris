import { fireEvent, render } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it } from 'vitest';
import { rootReducer } from '../../src/app/reducers.ts';
import { usePaddleControls } from '../../src/game/controls.ts';
import { configureStore } from '@reduxjs/toolkit';

const Harness = () => {
  usePaddleControls('room-1', true);
  return null;
};

describe('usePaddleControls', () => {
  it('sends direction changes and releases the paddle on blur', () => {
    const actions: { readonly type: string; readonly payload?: unknown }[] = [];
    const record = () => (next: (action: unknown) => unknown) => (action: unknown) => {
      actions.push(action as { type: string; payload?: unknown });
      return next(action);
    };
    const store = configureStore({ reducer: rootReducer, middleware: (getDefault) => getDefault().concat(record) });
    render(<Provider store={store}><Harness /></Provider>);

    fireEvent.keyDown(window, { code: 'KeyW' });
    fireEvent.keyUp(window, { code: 'KeyW' });
    fireEvent.keyDown(window, { code: 'KeyS' });
    fireEvent.blur(window);

    expect(actions.map(({ payload }) => payload)).toEqual([
      { roomId: 'room-1', direction: -1 },
      { roomId: 'room-1', direction: 0 },
      { roomId: 'room-1', direction: 1 },
      { roomId: 'room-1', direction: 0 },
    ]);
  });
});

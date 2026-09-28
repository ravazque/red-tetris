import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ComponentProps, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { App } from '../../src/App.tsx';
import { rootReducer } from '../../src/app/reducers.ts';

type PreloadedState = Partial<ReturnType<typeof rootReducer>>;
type InitialEntry = NonNullable<ComponentProps<typeof MemoryRouter>['initialEntries']>[number];

// Real reducers without the socket middleware, so tests never open a connection.
export const renderWithStore = (ui: ReactElement, preloadedState?: PreloadedState) => {
  const store = configureStore({ reducer: rootReducer, preloadedState });
  return { store, ...render(<Provider store={store}>{ui}</Provider>) };
};

export const renderApp = (entry: InitialEntry, preloadedState?: PreloadedState) =>
  renderWithStore(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>,
    preloadedState,
  );

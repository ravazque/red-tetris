import { configureStore, type Middleware, type UnknownAction } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import type { ComponentProps, ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { App } from '../../src/App.tsx';
import { rootReducer } from '../../src/app/reducers.ts';

type PreloadedState = Partial<ReturnType<typeof rootReducer>>;
type InitialEntry = NonNullable<ComponentProps<typeof MemoryRouter>['initialEntries']>[number];

// Real reducers without the socket middleware, so tests never open a connection; actions records every dispatch.
export const renderWithStore = (ui: ReactElement, preloadedState?: PreloadedState) => {
  const actions: UnknownAction[] = [];
  const record: Middleware = () => (next) => (action) => {
    actions.push(action as UnknownAction);
    return next(action);
  };
  const store = configureStore({
    reducer: rootReducer,
    preloadedState,
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(record),
  });
  return { store, actions, ...render(<Provider store={store}>{ui}</Provider>) };
};

export const renderApp = (entry: InitialEntry, preloadedState?: PreloadedState) =>
  renderWithStore(
    <MemoryRouter initialEntries={[entry]}>
      <App />
    </MemoryRouter>,
    preloadedState,
  );

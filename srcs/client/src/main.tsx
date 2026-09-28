import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Route, Routes } from 'react-router';
import { store } from './app/store.ts';
import { GamePage } from './pages/GamePage.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/:room/:player" element={<GamePage />} />
        </Routes>
      </BrowserRouter>
    </Provider>
  </StrictMode>,
);

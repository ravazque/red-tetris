import { Route, Routes } from 'react-router';
import { GamePage } from './pages/GamePage.tsx';
import { HomePage } from './pages/HomePage.tsx';

// /<room>/<player> plays; /<room> is the invite link; / and unknown URLs show the home screen.
export const App = () => (
  <Routes>
    <Route path="/:room/:player" element={<GamePage />} />
    <Route path="/:room" element={<HomePage />} />
    <Route path="*" element={<HomePage />} />
  </Routes>
);

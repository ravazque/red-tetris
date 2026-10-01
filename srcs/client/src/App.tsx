import { Navigate, Route, Routes, useLocation } from 'react-router';
import { useTouchOnly } from './app/device.ts';
import { MobileNotice } from './components/MobileNotice.tsx';
import { GamePage } from './pages/GamePage.tsx';
import { HomePage } from './pages/HomePage.tsx';
import { resolvePath } from './room/navigation.ts';
import styles from './App.module.css';

// Only /, /<room> (invite link) and /<room>/<player> with valid names exist: anything else is replaced by its clean form or by /.
const Pages = () => {
  const { pathname, search, hash, state } = useLocation();
  const { path, rejected } = resolvePath(pathname);
  if (path !== pathname || search || hash) return <Navigate to={path} replace state={rejected ?? state} />;
  return (
    <Routes>
      <Route path="/:room/:player" element={<GamePage />} />
      <Route path="/:room" element={<HomePage />} />
      <Route path="*" element={<HomePage />} />
    </Routes>
  );
};

// Touch-only devices only get the home screen, inert behind the notice, so an invite link never takes a seat from a phone.
export const App = () =>
  useTouchOnly() ? (
    <>
      <div className={styles.behind} inert>
        <HomePage />
      </div>
      <MobileNotice />
    </>
  ) : (
    <Pages />
  );

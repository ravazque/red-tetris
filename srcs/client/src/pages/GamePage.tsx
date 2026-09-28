import { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { joinRequested, leaveRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { GameOver } from '../components/GameOver.tsx';
import { InviteLink } from '../components/InviteLink.tsx';
import { PixelText } from '../components/PixelText.tsx';
import { PlayerField } from '../components/PlayerField.tsx';
import { PongArena } from '../components/PongArena.tsx';
import { RoomPanel } from '../components/RoomPanel.tsx';
import { isValidName, locationMode } from '../room/navigation.ts';
import { isSelfHost, selectSeats } from '../room/reducer.ts';
import styles from './GamePage.module.css';

// Game screen for /<room>/<player_name>: joins while mounted, lays out the room's mode and starts solo rooms.
export const GamePage = () => {
  const { room = '', player = '' } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const roomState = useAppSelector((state) => state.room);
  const valid = isValidName(room) && isValidName(player);
  const requestedMode = locationMode(location.state);
  const mode = roomState.mode ?? requestedMode;
  const canStart = roomState.phase === 'waiting' && isSelfHost(roomState);
  const seats = selectSeats(roomState, player);
  const self = seats.find((seat) => seat.self) ?? seats[0];
  const rival = seats.find((seat) => !seat.self) ?? null;

  useEffect(() => {
    if (!valid) return;
    dispatch(joinRequested({ roomId: room, playerName: player, mode: requestedMode }));
    return () => {
      dispatch(leaveRequested({ roomId: room }));
    };
  }, [dispatch, valid, room, player, requestedMode]);

  useEffect(() => {
    if (mode === 'solo' && canStart) dispatch(startRequested({ roomId: room }));
  }, [dispatch, mode, canStart, room]);

  if (!valid) return <Navigate to={isValidName(room) ? `/${room}` : '/'} replace />;

  return (
    <main className={`${styles.page} ${styles[mode]}`}>
      <header className={styles.top}>
        <Link to="/" className={styles.logo} aria-label="Home">
          <PixelText text="Red" className={styles.red} /> <PixelText text="Tetris" className={styles.cyan} />
        </Link>
        <RoomPanel />
        <Link to="/" className={styles.leave}>
          <PixelText text="Leave" />
        </Link>
      </header>
      <section className={styles.stage}>
        {mode === 'pontrix' ? (
          <PongArena left={seats[0]} right={seats[1] ?? null} />
        ) : (
          <>
            <PlayerField seat={self} />
            {mode === 'versus' && <PlayerField seat={rival} />}
          </>
        )}
        <GameOver />
      </section>
      {mode !== 'solo' && rival === null && <InviteLink room={room} />}
    </main>
  );
};

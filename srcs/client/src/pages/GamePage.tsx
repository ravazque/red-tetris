import { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { joinRequested, leaveRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { GameOver } from '../components/GameOver.tsx';
import { InviteLobby } from '../components/InviteLobby.tsx';
import { PausePanel } from '../components/PausePanel.tsx';
import { PieceRain } from '../components/PieceRain.tsx';
import { PixelText } from '../components/PixelText.tsx';
import { PlayerField } from '../components/PlayerField.tsx';
import { PongArena } from '../components/PongArena.tsx';
import { RoomPanel } from '../components/RoomPanel.tsx';
import { isValidName, locationMode, type RejectedLocationState } from '../room/navigation.ts';
import { hasStarted, isSelfHost, selectSeats } from '../room/reducer.ts';
import { WAITING_TEXT } from '../texts.ts';
import styles from './GamePage.module.css';

// Game screen for /<room>/<player_name>: joins while mounted, lays out the room's mode and starts solo rooms.
// The invite only exists before the first round; a versus started alone is laid out as solo.
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
  const started = hasStarted(roomState);
  const inviting = mode !== 'solo' && rival === null && !started;
  const layout = mode === 'versus' && rival === null && started ? 'solo' : mode;

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

  if (!valid) {
    const state: RejectedLocationState = { player, room };
    return <Navigate to={isValidName(room) ? `/${room}` : '/'} state={state} replace />;
  }

  return (
    <main className={`${styles.page} ${styles[layout]}`}>
      <PieceRain />
      <header className={styles.top}>
        <Link to="/" className={styles.logo} aria-label="Home">
          <PixelText text="Red" className={styles.red} /> <PixelText text="Tetris" className={styles.cyan} />
        </Link>
        <RoomPanel className={styles.panel} />
        <Link to="/" className={styles.leave}>
          <PixelText text="Leave" />
        </Link>
      </header>
      <section className={styles.stage}>
        <div className={styles.layout}>
          {layout === 'pontrix' ? (
            <PongArena left={seats[0]} right={seats[1] ?? null}>
              {inviting && <InviteLobby room={room} text={WAITING_TEXT.pontrix.panel} size={WAITING_TEXT.pontrix.panelSize} />}
            </PongArena>
          ) : (
            <>
              <PlayerField seat={self} className={styles.self} />
              {layout === 'versus' && <PlayerField seat={rival} className={styles.rival} />}
              {layout === 'versus' && inviting && (
                <InviteLobby room={room} text={WAITING_TEXT.versus.panel} size={WAITING_TEXT.versus.panelSize} className={styles.lobby} />
              )}
            </>
          )}
        </div>
        <GameOver />
        <PausePanel />
      </section>
    </main>
  );
};

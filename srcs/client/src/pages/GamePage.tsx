import { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { joinRequested, leaveRequested } from '../app/actions.ts';
import { useAppDispatch } from '../app/hooks.ts';
import { Board } from '../components/Board.tsx';
import { RoomPanel } from '../components/RoomPanel.tsx';
import { createBoard } from '../game/board.ts';
import { isValidName, type RoomLocationState } from '../room/navigation.ts';
import styles from './GamePage.module.css';

// Game screen for /<room>/<player_name>: joins the room while mounted; invalid names go back to the join form.
export const GamePage = () => {
  const { room = '', player = '' } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const valid = isValidName(room) && isValidName(player);
  const solo = (location.state as RoomLocationState | null)?.solo === true;

  useEffect(() => {
    if (!valid) return;
    dispatch(joinRequested({ roomId: room, playerName: player }));
    return () => {
      dispatch(leaveRequested({ roomId: room }));
    };
  }, [dispatch, valid, room, player]);

  if (!valid) return <Navigate to={isValidName(room) ? `/${room}` : '/'} replace />;

  return (
    <main className={styles.page}>
      <Board board={createBoard()} />
      <aside className={styles.side}>
        <h1 className={styles.room}>{room}</h1>
        <p className={styles.player}>{player}</p>
        {!solo && (
          <p className={styles.invite}>
            Invite: <output>{`${window.location.origin}/${room}`}</output>
          </p>
        )}
        <RoomPanel />
        <Link to="/">Leave</Link>
      </aside>
    </main>
  );
};

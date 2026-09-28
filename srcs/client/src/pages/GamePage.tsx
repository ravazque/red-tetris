import { useEffect } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import { joinRequested, leaveRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { Board } from '../components/Board.tsx';
import { RoomPanel } from '../components/RoomPanel.tsx';
import { createBoard } from '../game/board.ts';
import { isValidName, type RoomLocationState } from '../room/navigation.ts';
import { isSelfHost } from '../room/reducer.ts';
import styles from './GamePage.module.css';

// Game screen for /<room>/<player_name>: joins the room while mounted and starts solo rooms; invalid names go back.
export const GamePage = () => {
  const { room = '', player = '' } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const valid = isValidName(room) && isValidName(player);
  const mode = (location.state as RoomLocationState | null)?.mode;
  const solo = mode === 'solo';
  const canStart = useAppSelector(({ room: state }) => state.phase === 'waiting' && isSelfHost(state));

  useEffect(() => {
    if (!valid) return;
    dispatch(joinRequested(mode === undefined ? { roomId: room, playerName: player } : { roomId: room, playerName: player, mode }));
    return () => {
      dispatch(leaveRequested({ roomId: room }));
    };
  }, [dispatch, valid, room, player, mode]);

  useEffect(() => {
    if (solo && canStart) dispatch(startRequested({ roomId: room }));
  }, [dispatch, solo, canStart, room]);

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

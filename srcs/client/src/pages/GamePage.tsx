import { useEffect, useMemo, useRef } from 'react';
import { Link, Navigate, useLocation, useParams } from 'react-router';
import type { RoomJoinPayload } from '../../../shared/types.ts';
import { joinRequested, leaveRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector, useAppStore } from '../app/hooks.ts';
import { ControlsPanel } from '../components/ControlsPanel.tsx';
import { GameOver } from '../components/GameOver.tsx';
import { InviteLobby } from '../components/InviteLobby.tsx';
import { PausePanel } from '../components/PausePanel.tsx';
import { PieceRain } from '../components/PieceRain.tsx';
import { PixelText } from '../components/PixelText.tsx';
import { PlayerField } from '../components/PlayerField.tsx';
import { PongArena } from '../components/PongArena.tsx';
import { RoomPanel } from '../components/RoomPanel.tsx';
import { ScorePanel } from '../components/ScorePanel.tsx';
import { useControls, usePaddleControls } from '../game/controls.ts';
import { crownHolder } from '../game/score.ts';
import { isJoinLocation, joinPayload, locationMode, locationRule, type RejectedLocationState } from '../room/navigation.ts';
import { isSelfHost, selectSeats } from '../room/reducer.ts';
import { WAITING_TEXT } from '../texts.ts';
import styles from './GamePage.module.css';

// Game screen for /<room>/<player_name>: joins while mounted and again after a reconnection (a refused join goes back home), lays out the room's mode, starts solo rooms.
// Duels show the waiting panel with the invite while the rival seat is free in waiting; a duel that loses a player closes. Keys play while your round runs.
export const GamePage = () => {
  const { room = '', player = '' } = useParams();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const roomState = useAppSelector((state) => state.room);
  const online = useAppSelector((state) => state.connection.online);
  const requestedMode = isJoinLocation(location.state) ? undefined : locationMode(location.state);
  const mode = roomState.mode ?? requestedMode ?? 'versus';
  const canStart = roomState.phase === 'waiting' && isSelfHost(roomState);
  const seats = selectSeats(roomState, player);
  const self = seats.find((seat) => seat.self) ?? seats[0];
  const rival = seats.find((seat) => !seat.self) ?? null;
  const selfAlive = useAppSelector(({ game }) => (self.playerId ? game.players[self.playerId]?.isAlive === true : false));
  const crownId = useAppSelector(({ game }) => crownHolder(seats[0]?.playerId, seats[1]?.playerId, (id) => game.players[id]?.score ?? 0));
  const inviting = mode !== 'solo' && rival === null && (roomState.phase === null || roomState.phase === 'waiting');
  const waiting = WAITING_TEXT[mode === 'pontrix' ? 'pontrix' : 'versus'];
  const refused = roomState.roomId === room && roomState.error?.event === 'room:join' ? roomState.error.code : null;

  const requestedRule = requestedMode === 'versus' ? locationRule(location.state) : undefined;
  const join = useMemo(() => joinPayload(room, player, requestedMode, requestedRule), [room, player, requestedMode, requestedRule]);
  const pendingLeave = useRef<{ readonly join: RoomJoinPayload; readonly timer: ReturnType<typeof setTimeout> } | null>(null);
  const wasOnline = useRef(online);

  // React re-runs effects without a real unmount (StrictMode in dev, Fast Refresh): the leave waits a tick and a re-run with the same join keeps the seat.
  // A seat the home screen already took is kept as is.
  useEffect(() => {
    const pending = pendingLeave.current;
    pendingLeave.current = null;
    if (pending) clearTimeout(pending.timer);
    if (pending?.join !== join) {
      if (pending) dispatch(leaveRequested({ roomId: pending.join.roomId }));
      const seated = store.getState().room;
      if (seated.roomId !== join.roomId || seated.selfPlayerId === null) dispatch(joinRequested(join));
    }
    return () => {
      const timer = setTimeout(() => {
        pendingLeave.current = null;
        dispatch(leaveRequested({ roomId: join.roomId }));
      });
      pendingLeave.current = { join, timer };
    };
  }, [dispatch, store, join]);

  // The server dropped the old socket's seat (or restarted): take a seat again with the same name.
  useEffect(() => {
    if (online && !wasOnline.current) dispatch(joinRequested(join));
    wasOnline.current = online;
  }, [dispatch, online, join]);

  useEffect(() => {
    if (mode === 'solo' && canStart) dispatch(startRequested({ roomId: room }));
  }, [dispatch, mode, canStart, room]);

  useControls(room, roomState.phase === 'running' && roomState.pause === null && online && selfAlive);
  usePaddleControls(room, mode === 'pontrix' && roomState.phase === 'running' && roomState.pause === null && online && selfAlive);

  if (refused) {
    const state: RejectedLocationState = { player, room, code: refused };
    return <Navigate to="/" replace state={state} />;
  }

  return (
    <main className={`${styles.page} ${styles[mode]}`}>
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
          <ControlsPanel paddle={mode === 'pontrix'} className={styles.controls} />
          {mode === 'pontrix' ? (
            <PongArena left={seats[0]} right={seats[1] ?? null} crownId={crownId} className={styles.arena} />
          ) : (
            <>
              <PlayerField seat={self} crown={self.playerId !== null && self.playerId === crownId} spectrum={mode === 'versus'} className={styles.self} />
              {mode === 'versus' && <PlayerField seat={rival} crown={rival !== null && rival.playerId === crownId} spectrum className={styles.rival} />}
            </>
          )}
          <ScorePanel
            layout={mode}
            left={mode === 'pontrix' ? seats[0] : self}
            right={mode === 'pontrix' ? (seats[1] ?? null) : rival}
            best={mode === 'solo'}
            className={styles.score}
          />
        </div>
        {inviting && <InviteLobby room={room} text={waiting.panel} size={waiting.panelSize} />}
        <GameOver className={styles.over} />
        <PausePanel />
      </section>
    </main>
  );
};

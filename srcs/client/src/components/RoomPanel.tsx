import { ERROR_CODES, MAX_PLAYERS_PER_ROOM, type ErrorCode, type RoomPhase } from '../../../shared/constants.ts';
import { restartRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { isSelfHost } from '../room/reducer.ts';
import styles from './RoomPanel.module.css';

const PHASE_TEXT: Record<RoomPhase, string> = {
  waiting: 'Waiting for the host to start',
  running: 'Game running',
  finished: 'Game over',
};

const ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.roomFull]: `Room is full (${MAX_PLAYERS_PER_ROOM} players max)`,
  [ERROR_CODES.roomRunning]: 'A game is running in this room, join when it ends',
  [ERROR_CODES.invalidRoom]: 'Invalid room name',
  [ERROR_CODES.invalidPlayer]: 'Invalid name, or already taken in this room',
};

// Room phase, players (host derived from hostPlayerId), winner, host commands and the last room:error.
export const RoomPanel = () => {
  const room = useAppSelector((state) => state.room);
  const { roomId, phase, selfPlayerId, hostPlayerId, players, winnerPlayerId, error } = room;
  const dispatch = useAppDispatch();
  const isHost = roomId !== null && isSelfHost(room);
  const winner = players.find(({ playerId }) => playerId === winnerPlayerId);

  return (
    <section className={styles.panel}>
      {error && (
        <p role="alert" className={styles.error}>{ERROR_TEXT[error.code] ?? error.message}</p>
      )}
      {phase === null
        ? !error && <p className={styles.status}>Waiting for the server…</p>
        : (
          <>
            <p className={styles.status}>{PHASE_TEXT[phase]}</p>
            {phase === 'finished' && winner && <p className={styles.winner}>{winner.name} wins</p>}
            <ul className={styles.players}>
              {players.map(({ playerId, name }) => (
                <li key={playerId} className={styles.player}>
                  {name}
                  {playerId === hostPlayerId && <span className={styles.host}>♛ host</span>}
                  {playerId === selfPlayerId && <span className={styles.self}>you</span>}
                </li>
              ))}
            </ul>
            {isHost && phase === 'waiting' && (
              <button type="button" onClick={() => dispatch(startRequested({ roomId }))}>Start</button>
            )}
            {isHost && phase === 'finished' && (
              <button type="button" onClick={() => dispatch(restartRequested({ roomId }))}>Restart</button>
            )}
          </>
        )}
    </section>
  );
};

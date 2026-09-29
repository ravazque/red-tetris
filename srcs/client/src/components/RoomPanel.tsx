import { ERROR_CODES, MAX_PLAYERS_PER_ROOM, type ErrorCode, type RoomPhase } from '../../../shared/constants.ts';
import { restartRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { MODE_LABEL, MODE_MIN_PLAYERS } from '../room/modes.ts';
import { isSelfHost } from '../room/reducer.ts';
import { PixelText } from './PixelText.tsx';
import styles from './RoomPanel.module.css';

const PHASE_TEXT: Record<RoomPhase, string> = {
  waiting: 'Waiting for the host to start',
  running: 'Game running',
  finished: 'Round over',
};

const statusText = (phase: RoomPhase | null, isHost: boolean, players: number, needed: number) => {
  if (phase === null) return 'Waiting for the server…';
  if (phase === 'waiting' && isHost) return players < needed ? `Needs ${needed} players to start` : 'Start when ready';
  return PHASE_TEXT[phase];
};

const ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.roomFull]: `Room is full (${MAX_PLAYERS_PER_ROOM} players max)`,
  [ERROR_CODES.roomRunning]: 'A game is running in this room, join when it ends',
  [ERROR_CODES.invalidRoom]: 'Invalid room code',
  [ERROR_CODES.roomNotFound]: 'No room with that code',
  [ERROR_CODES.notEnoughPlayers]: 'Pon-Trix needs 2 players to start',
  [ERROR_CODES.invalidPlayer]: 'Invalid name, or already taken in this room',
};

// HUD bar: mode, phase or the last room:error, and the host commands; the room code lives in the invite.
export const RoomPanel = ({ className = '' }: { readonly className?: string }) => {
  const room = useAppSelector((state) => state.room);
  const { roomId, mode, phase, players, error } = room;
  const dispatch = useAppDispatch();
  const isHost = roomId !== null && isSelfHost(room);
  const needed = mode === null ? 1 : MODE_MIN_PLAYERS[mode];

  return (
    <section className={`${styles.panel} ${className}`}>
      {mode && <PixelText text={MODE_LABEL[mode]} className={`${styles.mode} ${styles[mode]}`} />}
      {error ? (
        <p role="alert" className={styles.error}>
          <PixelText text={ERROR_TEXT[error.code] ?? error.message} />
        </p>
      ) : (
        <p className={styles.status}>{statusText(phase, isHost, players.length, needed)}</p>
      )}
      {isHost && phase === 'waiting' && (
        <button type="button" disabled={players.length < needed} onClick={() => dispatch(startRequested({ roomId }))}>
          <PixelText text="Start" />
        </button>
      )}
      {isHost && phase === 'finished' && (
        <button type="button" onClick={() => dispatch(restartRequested({ roomId }))}>
          <PixelText text="Restart" />
        </button>
      )}
    </section>
  );
};

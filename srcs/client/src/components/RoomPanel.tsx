import { ERROR_CODES, type ErrorCode } from '../../../shared/constants.ts';
import { restartRequested, startRequested } from '../app/actions.ts';
import { useAppDispatch, useAppSelector } from '../app/hooks.ts';
import { MODE_LABEL, MODE_SEATS, RULE_LABEL } from '../room/modes.ts';
import { isSelfHost, selectPlayers, type RoomState } from '../room/reducer.ts';
import { PixelText } from './PixelText.tsx';
import styles from './RoomPanel.module.css';

const ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  [ERROR_CODES.notEnoughPlayers]: 'Two players are needed to start',
  [ERROR_CODES.notReady]: 'Your rival is not ready yet',
  [ERROR_CODES.unauthorized]: 'Only a player of this room can do that',
  [ERROR_CODES.invalidPhase]: 'Not possible right now',
};

interface Status {
  readonly room: RoomState;
  readonly host: boolean;
  readonly seated: boolean;
  readonly selfOut: boolean;
}

const statusText = ({ room, host, seated, selfOut }: Status) => {
  const { mode, phase, closed } = room;
  const { self, rival } = selectPlayers(room);
  if (phase === null) return 'Waiting for the server…';
  if (closed) return 'Room closed';
  if (phase === 'running') return rival && selfOut ? `Waiting for ${rival.name} to finish` : 'Game running';
  if (!seated) return 'Waiting for a rival';
  if (mode === 'solo') return phase === 'finished' ? 'Round over' : 'Starting…';
  if (rival && !rival.isConnected) return `Waiting for ${rival.name} to reconnect`;
  if (host) return rival?.isReady ? `${rival.name} is ready: press ${phase === 'finished' ? 'Restart' : 'Start'}` : `Waiting for ${rival?.name} to be ready`;
  if (self?.isReady) return `Waiting for ${rival?.name} to ${phase === 'finished' ? 'restart' : 'start'}`;
  return phase === 'finished' ? 'Round over: press Ready for a rematch' : 'Press Ready when you are ready';
};

// HUD bar: mode, status or the last room command error, and the round button. In duels the guest presses Ready and the host,
// unlocked by it, starts or restarts the round; solo starts by itself. Refused joins show on the home screen; input races stay silent.
export const RoomPanel = ({ className = '' }: { readonly className?: string }) => {
  const room = useAppSelector((state) => state.room);
  const selfOut = useAppSelector(({ game }) => (room.selfPlayerId ? game.players[room.selfPlayerId]?.isAlive === false : false));
  const dispatch = useAppDispatch();
  const { roomId, mode, phase, players } = room;
  const { self, rival } = selectPlayers(room);
  const host = isSelfHost(room);
  const seated = mode !== null && players.length >= MODE_SEATS[mode];
  const duel = mode !== 'solo';
  const open = roomId !== null && seated && !room.closed && (phase === 'finished' || (phase === 'waiting' && duel));
  const label = duel && !host ? 'Ready' : phase === 'finished' ? 'Restart' : 'Start';
  const pressable = !duel || (host ? rival?.isReady === true : self?.isReady !== true);
  const error = room.error && room.error.event !== 'room:join' && room.error.event !== 'game:input' ? room.error : null;

  return (
    <section className={`${styles.panel} ${className}`}>
      {mode && <PixelText text={MODE_LABEL[mode]} className={`${styles.mode} ${styles[mode]}`} />}
      {mode === 'versus' && room.rule && <PixelText text={RULE_LABEL[room.rule]} className={`${styles.mode} ${styles.rule}`} />}
      {error ? (
        <p role="alert" className={styles.error}>
          <PixelText text={ERROR_TEXT[error.code] ?? error.message} />
        </p>
      ) : (
        <p className={styles.status}>{statusText({ room, host, seated, selfOut })}</p>
      )}
      {open && roomId !== null && (
        <button
          type="button"
          className={pressable ? styles.beckon : undefined}
          disabled={!pressable}
          onClick={() => dispatch(phase === 'finished' ? restartRequested({ roomId }) : startRequested({ roomId }))}
        >
          <PixelText text={label} />
        </button>
      )}
    </section>
  );
};

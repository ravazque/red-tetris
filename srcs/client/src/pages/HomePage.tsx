import { useCallback, useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import { ERROR_CODES, type ErrorCode, type RoomMode } from '../../../shared/constants.ts';
import type { PieceType } from '../../../shared/game/types.ts';
import { useAppSelector } from '../app/hooks.ts';
import { PiecePreview } from '../components/PiecePreview.tsx';
import { PieceRain } from '../components/PieceRain.tsx';
import { PixelText } from '../components/PixelText.tsx';
import { RulePicker } from '../components/RulePicker.tsx';
import { MODE_LABEL } from '../room/modes.ts';
import { createRoomId, isValidName, locationRejected, roomPath, type RoomLocationState } from '../room/navigation.ts';
import styles from './HomePage.module.css';

const NAME_HINT = '3 to 12 letters, digits, - or _';
const ROOM_HINT = `A code like 3f9a1c2e (${NAME_HINT})`;

type Field = 'player' | 'room';

interface FieldError {
  readonly field: Field;
  readonly title: string;
  readonly hint: string;
}

const FORMAT_TEXT: Record<Field, { readonly empty: string; readonly invalid: string; readonly hint: string }> = {
  player: { empty: 'Enter your name', invalid: 'Invalid name', hint: NAME_HINT },
  room: { empty: 'Enter a room code', invalid: 'Invalid room code', hint: ROOM_HINT },
};

const nameError = (field: Field, value: string): FieldError | null =>
  isValidName(value) ? null : { field, title: FORMAT_TEXT[field][value === '' ? 'empty' : 'invalid'], hint: FORMAT_TEXT[field].hint };

// room:join refusals sent back from the game screen, shown under the field to change.
const JOIN_ERROR: Partial<Record<ErrorCode, FieldError>> = {
  [ERROR_CODES.roomFull]: { field: 'room', title: 'Room is full', hint: 'Every seat in that room is taken' },
  [ERROR_CODES.roomRunning]: { field: 'room', title: 'Game in progress', hint: 'Join that room when the round ends' },
  [ERROR_CODES.roomNotFound]: { field: 'room', title: 'Room not found', hint: 'Check the code, or create a room above' },
  [ERROR_CODES.roomClosed]: { field: 'room', title: 'Room closed', hint: 'That game is over: create a new room above' },
  [ERROR_CODES.invalidRoom]: { field: 'room', title: 'Invalid room code', hint: ROOM_HINT },
  [ERROR_CODES.invalidPlayer]: { field: 'player', title: 'Name taken', hint: 'Someone in that room already uses it' },
};

const joinError = (code: ErrorCode): FieldError => JOIN_ERROR[code] ?? { field: 'room', title: 'Could not join', hint: 'Try again in a moment' };

const fieldError = (player: string, room: string) => nameError('player', player) ?? nameError('room', room);

const MODES: readonly { mode: RoomMode; action: string; about: string }[] = [
  { mode: 'solo', action: 'Play', about: 'Classic Tetris on your own, in a private room.' },
  { mode: 'versus', action: 'Create', about: 'One on one with the same pieces: clear lines to bury your rival.' },
  { mode: 'pontrix', action: 'Create', about: 'Bonus: Tetris and Pong at once. Guard your goal with a paddle.' },
];

const ICON_PIECES: Record<RoomMode, readonly PieceType[]> = { solo: ['T'], versus: ['S', 'Z'], pontrix: [] };

// Entry screen for / and /<room> (invite link: room prefilled); rejected URLs and refused joins arrive at / with the values to fix. Every action ends on /<room>/<player>.
export const HomePage = () => {
  const { room: invitedRoom = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const savedName = useAppSelector((state) => state.profile.playerName);
  const rejected = locationRejected(location.state);
  const [player, setPlayer] = useState(rejected?.player ?? savedName);
  const [room, setRoom] = useState(rejected?.room ?? invitedRoom);
  const [error, setError] = useState<FieldError | null>(() => {
    if (!rejected) return null;
    if (rejected.code) return joinError(rejected.code);
    return rejected.player === undefined ? nameError('room', rejected.room) : fieldError(rejected.player, rejected.room);
  });
  const [attempts, setAttempts] = useState(0);
  const [picking, setPicking] = useState(false);
  const closePicker = useCallback(() => setPicking(false), []);
  const nameReady = isValidName(player) && error?.field !== 'player';

  const accepted = (failed: FieldError | null) => {
    if (failed) {
      setError(failed);
      setAttempts((count) => count + 1);
    }
    return failed === null;
  };

  const enter = (roomId: string, state: RoomLocationState) => {
    if (accepted(fieldError(player, roomId))) navigate(roomPath(roomId, player), { state });
  };

  // Versus asks for its rule in a panel first; the other cards create their room at once.
  const create = (mode: RoomMode) => {
    if (mode !== 'versus') enter(createRoomId(), { mode });
    else if (accepted(nameError('player', player))) setPicking(true);
  };

  const onJoin = (event: FormEvent) => {
    event.preventDefault();
    enter(room, { join: true });
  };

  const message = (field: Field) => (
    <div className={styles.message}>
      {error?.field === field && (
        <p key={attempts} role="alert" className={styles.error}>
          <PixelText text={error.title} className={styles.errorTitle} />
          <span className={styles.hint}>{error.hint}</span>
        </p>
      )}
    </div>
  );

  return (
    <main className={styles.page}>
      <PieceRain />
      <h1 className={styles.title}>
        <PixelText text="Red" className={styles.red} /> <PixelText text="Tetris" className={styles.cyan} />
      </h1>
      <div className={styles.menu}>
        <label className={styles.field}>
          <PixelText text="Player name" />
          <input
            value={player}
            onChange={(event) => setPlayer(event.target.value)}
            aria-invalid={error?.field === 'player'}
            autoFocus={!nameReady}
          />
        </label>
        {message('player')}
        <div className={styles.cards}>
          {MODES.map(({ mode, action, about }) => (
            <article key={mode} className={`${styles.card} ${styles[mode]}`}>
              <div className={styles.icon} aria-hidden="true">
                {ICON_PIECES[mode].map((type) => (
                  <PiecePreview key={type} type={type} />
                ))}
              </div>
              <h2 className={styles.cardTitle}>
                <PixelText text={MODE_LABEL[mode]} />
              </h2>
              <p className={styles.about}>{about}</p>
              <button type="button" onClick={() => create(mode)} aria-label={`${action} ${MODE_LABEL[mode]}`}>
                <PixelText text={action} />
              </button>
            </article>
          ))}
        </div>
        <form className={`${styles.join} ${invitedRoom ? styles.invited : ''}`} onSubmit={onJoin} noValidate>
          <label className={styles.field}>
            <PixelText text="Room code" />
            <input
              value={room}
              onChange={(event) => setRoom(event.target.value)}
              aria-invalid={error?.field === 'room'}
              autoFocus={nameReady}
            />
          </label>
          <button type="submit">
            <PixelText text="Join" />
          </button>
        </form>
        {message('room')}
      </div>
      {picking && <RulePicker onPick={(rule) => enter(createRoomId(), { mode: 'versus', rule })} onClose={closePicker} />}
    </main>
  );
};

import { useState, type FormEvent } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';
import type { RoomMode } from '../../../shared/constants.ts';
import type { PieceType } from '../../../shared/game/types.ts';
import { useAppSelector } from '../app/hooks.ts';
import { PiecePreview } from '../components/PiecePreview.tsx';
import { PieceRain } from '../components/PieceRain.tsx';
import { PixelText } from '../components/PixelText.tsx';
import { MODE_LABEL } from '../room/modes.ts';
import { createRoomId, isValidName, locationRejected, roomPath, type RoomLocationState } from '../room/navigation.ts';
import styles from './HomePage.module.css';

const NAME_HINT = '4 to 16 letters, digits, - or _';

type Field = 'player' | 'room';

interface FieldError {
  readonly field: Field;
  readonly empty: boolean;
}

const ERROR_TEXT: Record<Field, { readonly empty: string; readonly invalid: string; readonly hint: string }> = {
  player: { empty: 'Enter your name', invalid: 'Invalid name', hint: NAME_HINT },
  room: { empty: 'Enter a room code', invalid: 'Invalid room code', hint: `A code like 3f9a1c2e (${NAME_HINT})` },
};

const fieldError = (player: string, room: string): FieldError | null => {
  if (!isValidName(player)) return { field: 'player', empty: player === '' };
  if (!isValidName(room)) return { field: 'room', empty: room === '' };
  return null;
};

const MODES: readonly { mode: RoomMode; action: string; about: string }[] = [
  { mode: 'solo', action: 'Play', about: 'Classic Tetris on your own, in a private room.' },
  { mode: 'versus', action: 'Create', about: 'One on one with the same pieces: clear lines to bury your rival.' },
  { mode: 'pontrix', action: 'Create', about: 'Bonus: Tetris and Pong at once. Guard your goal with a paddle.' },
];

const ICON_PIECES: Record<RoomMode, readonly PieceType[]> = { solo: ['T'], versus: ['S', 'Z'], pontrix: [] };

// Entry screen for /, /<room> (invite link: room prefilled) and unknown URLs; every action ends on /<room>/<player>.
export const HomePage = () => {
  const { room: invitedRoom = '' } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const savedName = useAppSelector((state) => state.profile.playerName);
  const rejected = locationRejected(location.state);
  const [player, setPlayer] = useState(rejected?.player ?? savedName);
  const [room, setRoom] = useState(rejected?.room ?? invitedRoom);
  const [error, setError] = useState(() => rejected && fieldError(rejected.player, rejected.room));
  const [attempts, setAttempts] = useState(0);
  const nameReady = isValidName(player) && error?.field !== 'player';

  const enter = (roomId: string, mode: RoomMode) => {
    const failed = fieldError(player, roomId);
    if (failed) {
      setError(failed);
      setAttempts((count) => count + 1);
      return;
    }
    const state: RoomLocationState = { mode };
    navigate(roomPath(roomId, player), { state });
  };

  const onJoin = (event: FormEvent) => {
    event.preventDefault();
    enter(room, 'versus');
  };

  const message = (field: Field) => (
    <div className={styles.message}>
      {error?.field === field && (
        <p key={attempts} role="alert" className={styles.error}>
          <PixelText text={ERROR_TEXT[field][error.empty ? 'empty' : 'invalid']} className={styles.errorTitle} />
          <span className={styles.hint}>{ERROR_TEXT[field].hint}</span>
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
              <button type="button" onClick={() => enter(createRoomId(), mode)} aria-label={`${action} ${MODE_LABEL[mode]}`}>
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
    </main>
  );
};

import { useState, type CSSProperties, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import type { PieceType } from '../../../shared/game/types.ts';
import { PiecePreview } from '../components/PiecePreview.tsx';
import { PixelText } from '../components/PixelText.tsx';
import { MODE_LABEL, type RoomMode } from '../room/modes.ts';
import { createRoomId, isValidName, roomPath, type RoomLocationState } from '../room/navigation.ts';
import styles from './HomePage.module.css';

const NAME_HINT = '4 to 16 letters, digits, - or _';

type Field = 'player' | 'room';

const ERROR_TITLE: Record<Field, { readonly empty: string; readonly invalid: string }> = {
  player: { empty: 'Enter your name', invalid: 'Invalid name' },
  room: { empty: 'Enter a room name', invalid: 'Invalid room name' },
};

const MODES: readonly { mode: RoomMode; action: string; about: string }[] = [
  { mode: 'solo', action: 'Play', about: 'Classic Tetris on your own, in a private room.' },
  { mode: 'versus', action: 'Create', about: 'One on one with the same pieces: clear lines to bury your rival.' },
  { mode: 'pontrix', action: 'Create', about: 'Bonus: Tetris and Pong at once. Guard your goal with a paddle.' },
];

const ICON_PIECES: Record<RoomMode, readonly PieceType[]> = { solo: ['T'], versus: ['S', 'Z'], pontrix: [] };

const RAIN: readonly { type: PieceType; left: number; delay: number; duration: number }[] = [
  { type: 'T', left: 6, delay: 0, duration: 11 },
  { type: 'I', left: 18, delay: 4, duration: 14 },
  { type: 'S', left: 78, delay: 2, duration: 12 },
  { type: 'L', left: 90, delay: 6, duration: 15 },
  { type: 'O', left: 64, delay: 9, duration: 13 },
];

// Entry screen for /, /<room> (invite link: room prefilled) and unknown URLs; every action ends on /<room>/<player>.
export const HomePage = () => {
  const { room: invitedRoom = '' } = useParams();
  const navigate = useNavigate();
  const [player, setPlayer] = useState('');
  const [room, setRoom] = useState(invitedRoom);
  const [error, setError] = useState<{ readonly field: Field; readonly value: string } | null>(null);
  const [attempts, setAttempts] = useState(0);

  const fail = (field: Field, value: string) => {
    setError({ field, value });
    setAttempts((count) => count + 1);
  };

  const enter = (roomId: string, mode: RoomMode) => {
    if (!isValidName(player)) return fail('player', player);
    if (!isValidName(roomId)) return fail('room', roomId);
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
          <PixelText text={ERROR_TITLE[field][error.value === '' ? 'empty' : 'invalid']} className={styles.errorTitle} />
          <span className={styles.hint}>{NAME_HINT}</span>
        </p>
      )}
    </div>
  );

  return (
    <main className={styles.page}>
      <div className={styles.rain} aria-hidden="true">
        {RAIN.map(({ type, left, delay, duration }) => (
          <PiecePreview
            key={type}
            type={type}
            className={styles.drop}
            style={{ left: `${left}%`, animationDelay: `${delay}s`, animationDuration: `${duration}s` } as CSSProperties}
          />
        ))}
      </div>
      <h1 className={styles.title}>
        <PixelText text="Red" className={styles.red} /> <PixelText text="Tetris" className={styles.cyan} />
      </h1>
      <form className={styles.form} onSubmit={onJoin} noValidate>
        <label className={styles.field}>
          <PixelText text="Player name" />
          <input
            value={player}
            onChange={(event) => setPlayer(event.target.value)}
            aria-invalid={error?.field === 'player'}
            autoFocus
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
        <div className={`${styles.join} ${invitedRoom ? styles.invited : ''}`}>
          <label className={styles.field}>
            <PixelText text="Room" />
            <input value={room} onChange={(event) => setRoom(event.target.value)} aria-invalid={error?.field === 'room'} />
          </label>
          <button type="submit">
            <PixelText text="Join" />
          </button>
        </div>
        {message('room')}
      </form>
    </main>
  );
};

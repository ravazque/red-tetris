import { useEffect, useState } from 'react';
import { useAppSelector } from '../app/hooks.ts';
import { PixelText } from './PixelText.tsx';
import styles from './PausePanel.module.css';

const useSecondsLeft = (ms: number, key: number) => {
  const [left, setLeft] = useState(Math.ceil(ms / 1000));

  useEffect(() => {
    const deadline = Date.now() + ms;
    const update = () => setLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000)));
    update();
    const timer = setInterval(update, 250);
    return () => clearInterval(timer);
  }, [ms, key]);

  return left;
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

const Countdown = ({ ms, revision }: { readonly ms: number; readonly revision: number }) => (
  <p className={styles.count}>
    <PixelText text={clock(useSecondsLeft(ms, revision))} />
  </p>
);

// Frozen game (#26): a light veil over the stage while a player may reconnect, or while our own socket is down.
export const PausePanel = () => {
  const online = useAppSelector((state) => state.connection.online);
  const { pause, players } = useAppSelector((state) => state.room);
  if (online && pause === null) return null;
  const name = players.find(({ playerId }) => playerId === pause?.playerId)?.name ?? 'your rival';

  return (
    <div className={styles.overlay} role="status" aria-live="polite">
      <div className={styles.card}>
        <h2 className={styles.title}>
          <PixelText text={online ? 'Paused' : 'Connection lost'} />
        </h2>
        <p className={styles.detail}>{online ? `Waiting for ${name} to reconnect` : 'Reconnecting…'}</p>
        {online && pause && <Countdown ms={pause.graceMs} revision={pause.revision} />}
        <p className={styles.hint}>{online ? 'The game resumes as soon as they are back' : 'Your seat is kept for a few seconds'}</p>
      </div>
    </div>
  );
};

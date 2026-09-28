import { useAppSelector } from '../app/hooks.ts';
import { isSelfHost, type RoomState } from '../room/reducer.ts';
import { PixelText } from './PixelText.tsx';
import styles from './GameOver.module.css';

const result = ({ mode, players, selfPlayerId, winnerPlayerId }: RoomState) => {
  if (winnerPlayerId === null) {
    return mode === 'solo' || players.length < 2 ? { title: 'Game over', tone: styles.over } : { title: 'Draw', tone: styles.over };
  }
  if (winnerPlayerId === selfPlayerId) return { title: 'You win', tone: styles.win };
  const winner = players.find(({ playerId }) => playerId === winnerPlayerId);
  return { title: 'You lose', detail: winner && `${winner.name} wins`, tone: styles.lose };
};

// End-of-round overlay: win, lose, draw (same-tick eliminations) or the end of a solo game.
export const GameOver = () => {
  const room = useAppSelector((state) => state.room);
  if (room.phase !== 'finished') return null;
  const { title, detail, tone } = result(room);

  return (
    <div className={styles.overlay} role="dialog" aria-label="Round over">
      <div className={`${styles.card} ${tone}`}>
        <h2 className={styles.title}>
          <PixelText text={title} />
        </h2>
        {detail && <p className={styles.detail}>{detail}</p>}
        <p className={styles.hint}>{isSelfHost(room) ? 'Press Restart to play again' : 'Waiting for the host to restart'}</p>
      </div>
    </div>
  );
};

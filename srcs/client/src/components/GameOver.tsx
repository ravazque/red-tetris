import type { FinishReason } from '../app/actions.ts';
import { useAppSelector } from '../app/hooks.ts';
import { isSelfHost, type RoomState } from '../room/reducer.ts';
import { PixelText } from './PixelText.tsx';
import styles from './GameOver.module.css';

const WIN_DETAIL: Record<FinishReason, (rival: string) => string> = {
  topout: (rival) => `${rival} topped out`,
  left: (rival) => `${rival} left the game`,
  timeout: (rival) => `${rival} did not reconnect in time`,
};

const result = ({ mode, players, selfPlayerId, winnerPlayerId, finishReason }: RoomState) => {
  if (winnerPlayerId === null) {
    return mode === 'solo' || players.length < 2
      ? { title: 'Game over', detail: 'Your stack reached the top', tone: styles.over }
      : { title: 'Draw', detail: 'Both players topped out at once', tone: styles.over };
  }
  if (winnerPlayerId === selfPlayerId) {
    const rival = players.find(({ playerId }) => playerId !== selfPlayerId)?.name ?? 'Your rival';
    return { title: 'You win', detail: WIN_DETAIL[finishReason ?? 'topout'](rival), tone: styles.win };
  }
  const winner = players.find(({ playerId }) => playerId === winnerPlayerId);
  return { title: 'You lose', detail: winner && `${winner.name} wins`, tone: styles.lose };
};

// End-of-round overlay: win (with why the rival lost), lose, draw (same-tick eliminations) or the end of a solo game.
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

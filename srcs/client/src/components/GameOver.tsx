import { Link } from 'react-router';
import type { RoomClosure } from '../../../shared/types.ts';
import type { FinishReason } from '../app/actions.ts';
import { useAppSelector } from '../app/hooks.ts';
import { isSelfHost, selectPlayers, type RoomState } from '../room/reducer.ts';
import { PixelText } from './PixelText.tsx';
import styles from './GameOver.module.css';

const WIN_DETAIL: Record<Exclude<FinishReason, 'score'>, (rival: string) => string> = {
  topout: (rival) => `${rival} topped out`,
  left: (rival) => `${rival} left the game`,
  timeout: (rival) => `${rival} did not reconnect in time`,
};

interface Scores {
  readonly self: number;
  readonly rival: number;
}

const GONE: Record<RoomClosure['reason'], (name: string) => string> = {
  left: (name) => `${name} left`,
  timeout: (name) => `${name} did not reconnect in time`,
};

// A duel where both players topped out is decided by score: the card shows yours first.
const result = ({ mode, players, selfPlayerId, winnerPlayerId, finishReason, closed }: RoomState, scores: Scores) => {
  const tally = `${scores.self} to ${scores.rival}`;
  if (closed && finishReason === null) return { title: 'Room closed', detail: GONE[closed.reason](closed.playerName), tone: styles.closed };
  if (winnerPlayerId === null) {
    if (finishReason === 'score') return { title: 'Draw', detail: `Same score: ${tally}`, tone: styles.draw };
    return mode === 'solo' || players.length < 2
      ? { title: 'Game over', detail: 'Your stack reached the top', tone: styles.over }
      : { title: 'Draw', detail: 'Both players topped out at once', tone: styles.draw };
  }
  if (winnerPlayerId === selfPlayerId) {
    const rival = closed?.playerName ?? players.find(({ playerId }) => playerId !== selfPlayerId)?.name ?? 'Your rival';
    return { title: 'You win', detail: finishReason === 'score' ? tally : WIN_DETAIL[finishReason ?? 'topout'](rival), tone: styles.win };
  }
  const winner = players.find(({ playerId }) => playerId === winnerPlayerId)?.name ?? closed?.playerName;
  return { title: 'You lose', detail: finishReason === 'score' ? tally : winner && `${winner} wins`, tone: styles.lose };
};

// What to do next: in a duel the guest presses Ready and the host restarts; solo restarts at once; a closed room has no next round.
const nextStep = (room: RoomState) => {
  const { closed, finishReason } = room;
  if (closed) return finishReason === null || finishReason === closed.reason ? 'This room is closed' : `${GONE[closed.reason](closed.playerName)}: this room is closed`;
  const { self, rival } = selectPlayers(room);
  if (!rival) return 'Press Restart to play again';
  if (isSelfHost(room)) return rival.isReady ? `${rival.name} wants a rematch: press Restart` : `Waiting for ${rival.name} to be ready`;
  return self?.isReady ? `Waiting for ${rival.name} to restart` : 'Press Ready for a rematch';
};

// End-of-round overlay: win (with why the rival lost), lose, draw (same-tick eliminations), the end of a solo game, or a closed room (back to the menu).
export const GameOver = ({ className = '' }: { readonly className?: string }) => {
  const room = useAppSelector((state) => state.room);
  const { rival } = selectPlayers(room);
  const selfScore = useAppSelector(({ game }) => (room.selfPlayerId ? game.players[room.selfPlayerId]?.score : undefined)) ?? 0;
  const rivalScore = useAppSelector(({ game }) => (rival ? game.players[rival.playerId]?.score : undefined)) ?? 0;
  if (room.phase !== 'finished') return null;
  const { title, detail, tone } = result(room, { self: selfScore, rival: rivalScore });

  return (
    <div className={`${styles.overlay} ${className}`} role="dialog" aria-label="Round over">
      <div className={`${styles.card} ${tone}`}>
        <h2 className={styles.title}>
          <PixelText text={title} />
        </h2>
        {detail && <p className={styles.detail}>{detail}</p>}
        <p className={styles.hint}>{nextStep(room)}</p>
        {room.closed && (
          <Link to="/" className={styles.back}>
            <PixelText text="Back to menu" />
          </Link>
        )}
      </div>
    </div>
  );
};

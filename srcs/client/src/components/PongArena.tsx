import type { CSSProperties } from 'react';
import {
  PONTRIX_ARENA_WIDTH,
  PONTRIX_BALL_SIZE,
  PONTRIX_GAP_WIDTH,
  PONTRIX_LANE_WIDTH,
  PONTRIX_PADDLE_HEIGHT,
} from '../../../shared/game/pontrix.ts';
import { useAppSelector } from '../app/hooks.ts';
import { usePlayerGame } from '../game/hooks.ts';
import { boardOf } from '../game/reducer.ts';
import { PONG_CENTER } from '../pong/reducer.ts';
import type { Seat } from '../room/reducer.ts';
import { Board } from './Board.tsx';
import { FieldHeader } from './FieldHeader.tsx';
import { PixelText } from './PixelText.tsx';
import { Spectrum } from './Spectrum.tsx';
import styles from './PongArena.module.css';

const at = (x: number, y: number) => ({ '--x': x, '--y': y }) as CSSProperties;

const GEOMETRY = {
  '--lane': PONTRIX_LANE_WIDTH,
  '--gap': PONTRIX_GAP_WIDTH,
  '--paddle': PONTRIX_PADDLE_HEIGHT,
  '--ball': PONTRIX_BALL_SIZE,
} as CSSProperties;

// Pon-Trix face-off, positions in cells: goal | lane | board | gap | board | lane | goal; players in join order.
export const PongArena = ({ left, right }: { readonly left: Seat; readonly right: Seat | null }) => {
  const leftGame = usePlayerGame(left.playerId);
  const rightGame = usePlayerGame(right?.playerId);
  const pong = useAppSelector((state) => state.pong.state);
  const ball = pong?.ball ?? PONG_CENTER;
  const paddleY = (seat: Seat) => (seat.playerId === null ? undefined : pong?.paddles[seat.playerId]) ?? PONG_CENTER.y;
  const tone = (seat: Seat | null) => (seat?.self ? styles.self : styles.rival);
  const out = (alive: boolean | undefined) => (alive === false ? styles.out : '');

  return (
    <div className={styles.arena} style={GEOMETRY} data-testid="pong-arena">
      <div className={styles.row}>
        <div className={`${styles.left} ${tone(left)}`}>
          <FieldHeader seat={left} next={leftGame.snapshot?.next ?? null} />
        </div>
        <div className={`${styles.right} ${tone(right)}`}>
          <FieldHeader seat={right} next={rightGame.snapshot?.next ?? null} />
        </div>
      </div>
      <div className={`${styles.court} ${left.self ? styles.selfLeft : styles.selfRight}`}>
        <div className={`${styles.lane} ${tone(left)}`} />
        <div className={`${styles.slot} ${styles.innerRight} ${tone(left)} ${out(leftGame.snapshot?.isAlive)}`}>
          <Board board={boardOf(leftGame.snapshot)} className={styles.board} />
        </div>
        <div className={styles.net} />
        <div className={`${styles.slot} ${styles.innerLeft} ${tone(right)} ${out(rightGame.snapshot?.isAlive)}`}>
          <Board board={boardOf(rightGame.snapshot)} className={styles.board} />
          {right === null && (
            <p className={styles.waiting}>
              <PixelText text="Waiting for a rival…" />
            </p>
          )}
        </div>
        <div className={`${styles.lane} ${tone(right)}`} />
        <div className={`${styles.paddle} ${tone(left)}`} style={at(PONTRIX_LANE_WIDTH / 2, paddleY(left))} />
        {right && (
          <div
            className={`${styles.paddle} ${tone(right)}`}
            style={at(PONTRIX_ARENA_WIDTH - PONTRIX_LANE_WIDTH / 2, paddleY(right))}
          />
        )}
        <div className={styles.ball} style={at(ball.x, ball.y)} data-testid="pong-ball" />
      </div>
      <div className={styles.row}>
        <div className={`${styles.left} ${tone(left)}`}>{!left.self && <Spectrum heights={leftGame.spectrum} />}</div>
        <div className={`${styles.right} ${tone(right)}`}>
          {right && !right.self && <Spectrum heights={rightGame.spectrum} />}
        </div>
      </div>
    </div>
  );
};

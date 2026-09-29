import { useState, type CSSProperties } from 'react';
import { PIECE_TYPES } from '../../../shared/game/pieces.ts';
import type { PieceType } from '../../../shared/game/types.ts';
import { PiecePreview } from './PiecePreview.tsx';
import styles from './PieceRain.module.css';

interface Drop {
  readonly type: PieceType;
  readonly left: number;
  readonly delay: number;
  readonly duration: number;
  readonly spin: number;
}

const COUNT = 5;
const LANE = 21;
const JITTER = 6;
const DELAY_STEP = 2;

// One drop per lane (jittered, at least LANE - JITTER % apart) and staggered starts, so pieces never bunch up.
export const createRain = (random: () => number): readonly Drop[] => {
  const slots = Array.from({ length: COUNT }, (_, i) => i * DELAY_STEP);
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  return slots.map((slot, lane) => ({
    left: 2 + lane * LANE + random() * JITTER,
    type: PIECE_TYPES[Math.floor(random() * PIECE_TYPES.length)],
    delay: slot + random() * 0.5,
    duration: 11 + random() * 4,
    spin: random() < 0.5 ? 180 : -180,
  }));
};

// Decorative pieces falling behind the menu and every game screen, laid out anew on each visit.
export const PieceRain = () => {
  const [drops] = useState(() => createRain(Math.random));

  return (
    <div className={styles.rain} aria-hidden="true" data-testid="piece-rain">
      {drops.map(({ type, left, delay, duration, spin }, i) => (
        <PiecePreview
          key={i}
          type={type}
          className={styles.drop}
          style={
            {
              left: `${left}%`,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              '--spin': `${spin}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
};

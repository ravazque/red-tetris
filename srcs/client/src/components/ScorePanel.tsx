import type { CSSProperties, ReactNode } from 'react';
import type { RoomMode } from '../../../shared/constants.ts';
import { useAppSelector } from '../app/hooks.ts';
import { useBestScore, usePlayerGame } from '../game/hooks.ts';
import { leadOf } from '../game/score.ts';
import type { Seat } from '../room/reducer.ts';
import { PANEL_TEXT } from '../texts.ts';
import { PixelText } from './PixelText.tsx';
import { SidePanel } from './SidePanel.tsx';
import styles from './ScorePanel.module.css';

interface ScorePanelProps {
  readonly layout: RoomMode;
  readonly left: Seat;
  readonly right: Seat | null;
  readonly best: boolean;
  readonly className?: string;
}

const Points = ({ value }: { readonly value: number }) => {
  const text = String(value);
  return <PixelText text={text} className={`${styles.points} ${text.length > 6 ? styles.long : ''}`} />;
};

const Stat = ({ label, className = '', children }: { readonly label: string; readonly className?: string; readonly children: ReactNode }) => (
  <div className={`${styles.stat} ${className}`}>
    <PixelText text={label} className={styles.label} />
    {children}
  </div>
);

const Best = ({ score }: { readonly score: number }) => (
  <Stat label={PANEL_TEXT.best} className={styles.best}>
    <PixelText text={String(useBestScore(score))} className={styles.value} />
  </Stat>
);

// Solo: points, lines and, in solo rooms, the record. Versus and Pon-Trix: both players by side, the lead bar and, in Pon-Trix, goals.
export const ScorePanel = ({ layout, left, right, best, className = '' }: ScorePanelProps) => {
  const leftGame = usePlayerGame(left.playerId).snapshot;
  const rightGame = usePlayerGame(right?.playerId).snapshot;
  const goals = useAppSelector(({ pong }) => pong.state?.goals);
  const panel = `${styles.score} ${className}`;

  if (layout === 'solo') {
    return (
      <SidePanel title={PANEL_TEXT.score} className={panel}>
        <div className={styles.single} data-testid="score-self">
          <Stat label={PANEL_TEXT.points} className={styles.total}>
            <Points value={leftGame?.score ?? 0} />
          </Stat>
          <Stat label={PANEL_TEXT.lines} className={styles.lines}>
            <PixelText text={String(leftGame?.lines ?? 0)} className={styles.value} />
          </Stat>
          {best && <Best score={leftGame?.score ?? 0} />}
        </div>
      </SidePanel>
    );
  }

  const sides = [
    { seat: left, game: leftGame, self: left.self },
    { seat: right, game: rightGame, self: right?.self ?? false },
  ];
  const [you, rival] = sides[0].self ? sides : [sides[1], sides[0]];
  const lead = leadOf(you.game?.score ?? 0, rival.game?.score ?? 0);
  const leftShare = sides[0].self ? lead.share : 100 - lead.share;
  const leader = lead.leader === 'self' ? PANEL_TEXT.you : PANEL_TEXT.rival;

  return (
    <SidePanel title={PANEL_TEXT.score} className={panel}>
      <div className={styles.duel}>
        {sides.map(({ seat, game, self }, index) => (
          <div
            key={index === 0 ? 'left' : 'right'}
            className={`${styles.player} ${index === 0 ? styles.left : styles.right} ${self ? styles.self : styles.rival}`}
            data-testid={self ? 'score-self' : 'score-rival'}
          >
            <PixelText text={self ? PANEL_TEXT.you : PANEL_TEXT.rival} className={styles.name} />
            <Points value={game?.score ?? 0} />
            <Stat label={PANEL_TEXT.lines} className={styles.lines}>
              <PixelText text={String(game?.lines ?? 0)} className={styles.value} />
            </Stat>
            {layout === 'pontrix' && (
              <Stat label={PANEL_TEXT.goals} className={styles.goals}>
                <span className={styles.goal}>
                  <i className={styles.ball} />
                  <PixelText text={String((seat?.playerId && goals?.[seat.playerId]) || 0)} className={styles.value} />
                </span>
              </Stat>
            )}
          </div>
        ))}
        <div className={`${styles.bar} ${sides[0].self ? styles.selfLeft : styles.selfRight}`} style={{ '--share': `${leftShare}%` } as CSSProperties} aria-hidden="true" />
        <PixelText text={lead.leader ? `${leader} +${lead.margin}` : PANEL_TEXT.tied} className={styles.lead} />
      </div>
    </SidePanel>
  );
};

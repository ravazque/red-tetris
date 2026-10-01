import { useEffect, useId, useRef } from 'react';
import { ROOM_RULES, type RoomRule } from '../../../shared/constants.ts';
import { RULE_ABOUT, RULE_LABEL } from '../room/modes.ts';
import { PixelText } from './PixelText.tsx';
import styles from './RulePicker.module.css';

interface RulePickerProps {
  readonly onPick: (rule: RoomRule) => void;
  readonly onClose: () => void;
}

// Panel opened by the Versus card: how the duel ends. Picking a rule creates the room; Cancel, Escape or the backdrop close it.
export const RulePicker = ({ onPick, onClose }: RulePickerProps) => {
  const titleId = useId();
  const first = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    first.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <section className={styles.panel} role="dialog" aria-modal="true" aria-labelledby={titleId} onClick={(event) => event.stopPropagation()}>
        <h2 id={titleId} className={styles.title}>
          <PixelText text="Versus" />
        </h2>
        <p className={styles.lead}>How does the duel end?</p>
        <div className={styles.options}>
          {ROOM_RULES.map((rule, index) => (
            <button key={rule} ref={index === 0 ? first : undefined} type="button" className={styles.option} onClick={() => onPick(rule)}>
              <PixelText text={RULE_LABEL[rule]} className={styles.optionTitle} />
              <span className={styles.optionAbout}>{RULE_ABOUT[rule]}</span>
            </button>
          ))}
        </div>
        <button type="button" className={styles.cancel} onClick={onClose}>
          <PixelText text="Cancel" />
        </button>
      </section>
    </div>
  );
};

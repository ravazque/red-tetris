import { useEffect, useState } from 'react';
import { PixelText } from './PixelText.tsx';
import styles from './InviteLink.module.css';

type Target = 'code' | 'link';

const COPIED_MS = 1500;

// Invite while a seat is free; the code stays in the system font because the pixel font is uppercase and rooms are case-sensitive.
export const InviteLink = ({ room, className = '' }: { readonly room: string; readonly className?: string }) => {
  const [copied, setCopied] = useState<Target | null>(null);
  const link = `${window.location.origin}/${room}`;

  useEffect(() => {
    if (copied === null) return;
    const timer = setTimeout(() => setCopied(null), COPIED_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyButton = (target: Target, label: string, text: string) => (
    <button
      type="button"
      className={`${styles.copy} ${styles[`${target}-copy`]} ${copied === target ? styles.done : ''}`}
      title={target === 'link' ? link : undefined}
      onClick={() => navigator.clipboard?.writeText(text).then(() => setCopied(target), () => setCopied(null))}
    >
      <span aria-hidden={copied === target}>
        <PixelText text={label} />
      </span>
      <span aria-hidden={copied !== target}>
        <PixelText text="Copied" />
      </span>
    </button>
  );

  return (
    <fieldset className={`${styles.invite} ${className}`} aria-label="Invite a rival">
      <output className={styles.code}>{room}</output>
      <div className={styles.actions} aria-live="polite">
        {copyButton('code', 'Copy code', room)}
        {copyButton('link', 'Copy link', link)}
      </div>
    </fieldset>
  );
};

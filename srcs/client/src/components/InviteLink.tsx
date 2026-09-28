import { useState } from 'react';
import { PixelText } from './PixelText.tsx';
import styles from './InviteLink.module.css';

export const InviteLink = ({ room }: { readonly room: string }) => {
  const [copied, setCopied] = useState(false);
  const url = `${window.location.origin}/${room}`;
  const copy = () => navigator.clipboard?.writeText(url).then(() => setCopied(true), () => setCopied(false));

  return (
    <p className={styles.invite}>
      <PixelText text="Invite" className={styles.caption} />
      <output className={styles.url}>{url}</output>
      <button type="button" onClick={copy}>
        <PixelText text={copied ? 'Copied' : 'Copy'} />
      </button>
    </p>
  );
};

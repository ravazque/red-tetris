import type { CSSProperties } from 'react';
import { InviteLink } from './InviteLink.tsx';
import { PixelText } from './PixelText.tsx';
import styles from './InviteLobby.module.css';

// Grey panel over the game area while the rival seat is free; sizes and offsets per mode in layout.css.
interface InviteLobbyProps {
  readonly room: string;
  readonly text: string;
  readonly size: number;
  readonly className?: string;
}

export const InviteLobby = ({ room, text, size, className = '' }: InviteLobbyProps) => (
  <div className={`${styles.lobby} ${className}`} data-testid="invite-lobby">
    <PixelText text={text} className={styles.pulse} style={{ '--px': `${size}px` } as CSSProperties} />
    <InviteLink room={room} className={styles.invite} />
  </div>
);

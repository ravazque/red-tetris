import type { ReactNode } from 'react';
import { PixelText } from './PixelText.tsx';
import styles from './SidePanel.module.css';

interface SidePanelProps {
  readonly title: string;
  readonly className?: string;
  readonly children: ReactNode;
}

// Neon frame shared by the controls and score panels; the caller's class sets --tone.
export const SidePanel = ({ title, className = '', children }: SidePanelProps) => (
  <section className={`${styles.panel} ${className}`} aria-label={title}>
    <PixelText text={title} className={styles.title} />
    {children}
  </section>
);

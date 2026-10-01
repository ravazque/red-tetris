import { MOBILE_TEXT } from '../texts.ts';
import { PixelText } from './PixelText.tsx';
import styles from './MobileNotice.module.css';

// Covers the whole app with a blur that distorts it; the page behind is inert.
export const MobileNotice = () => (
  <div className={styles.notice} role="alertdialog" aria-modal="true" aria-label={MOBILE_TEXT.title}>
    <div className={styles.card}>
      <PixelText text={MOBILE_TEXT.title} className={styles.title} />
      <p className={styles.body}>{MOBILE_TEXT.body}</p>
    </div>
  </div>
);

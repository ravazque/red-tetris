import { CONTROLS, PANEL_TEXT } from '../texts.ts';
import { PixelText } from './PixelText.tsx';
import { SidePanel } from './SidePanel.tsx';
import styles from './ControlsPanel.module.css';

// Key legend beside the boards; the paddle keys only matter in Pon-Trix.
export const ControlsPanel = ({ paddle, className = '' }: { readonly paddle: boolean; readonly className?: string }) => (
  <SidePanel title={PANEL_TEXT.controls} className={`${styles.controls} ${className}`}>
    <dl className={styles.list}>
      {CONTROLS.filter((control) => paddle || !control.pontrix).map(({ keys, action }) => (
        <div key={action} className={styles.row}>
          <dt className={styles.keys}>
            {keys.map((key) => (
              <kbd key={key} className={styles.key}>
                <PixelText text={key} />
              </kbd>
            ))}
          </dt>
          <dd className={styles.action}>
            <PixelText text={action} />
          </dd>
        </div>
      ))}
    </dl>
  </SidePanel>
);

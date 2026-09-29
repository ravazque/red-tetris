import type { CSSProperties } from 'react';
import { glyphShape } from './pixelFont.ts';
import styles from './PixelText.module.css';

// Text drawn with the CSS bitmap font; the plain text stays in the DOM (visually hidden) for screen readers and tests.
interface PixelTextProps {
  readonly text: string;
  readonly className?: string;
  readonly style?: CSSProperties;
}

export const PixelText = ({ text, className = '', style }: PixelTextProps) => (
  <span className={`${styles.pixel} ${className}`} style={style}>
    <span className={styles.plain}>{text}</span>
    <span className={styles.glyphs} aria-hidden="true">
      {text
        .replaceAll('…', '...')
        .split(' ')
        .map((word, w) => (
          <span key={w} className={styles.word}>
            {[...word].map((char, c) => (
              <span key={c} className={styles.glyph} style={{ '--shape': glyphShape(char) } as CSSProperties} />
            ))}
          </span>
        ))}
    </span>
  </span>
);

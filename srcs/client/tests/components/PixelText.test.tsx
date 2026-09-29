import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PixelText } from '../../src/components/PixelText.tsx';
import { glyphShape } from '../../src/components/pixelFont.ts';

const UI_TEXT = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_:.,!?\'()/';

describe('glyphShape', () => {
  it('draws every character the interface uses', () => {
    expect([...UI_TEXT].filter((char) => glyphShape(char) === 'none')).toEqual([]);
  });

  it('is case-insensitive and places pixels one em apart', () => {
    expect(glyphShape('t')).toBe(glyphShape('T'));
    expect(glyphShape('T').split(', ').slice(0, 2)).toEqual(['1em 1em currentColor', '2em 1em currentColor']);
  });

  it('draws nothing for unknown characters', () => {
    expect(glyphShape('ñ')).toBe('none');
  });
});

describe('PixelText', () => {
  it('keeps the plain text and draws one glyph per character, grouped by word', () => {
    const { container } = render(<PixelText text="Game over" />);
    const [plain, glyphs] = container.firstElementChild?.children ?? [];

    expect(container.textContent).toBe('Game over');
    expect(plain?.textContent).toBe('Game over');
    expect(glyphs?.getAttribute('aria-hidden')).toBe('true');
    expect([...(glyphs?.children ?? [])].map((word) => word.children.length)).toEqual([4, 4]);
  });

  it('draws every space as a gap, also doubled, leading or trailing ones', () => {
    const { container } = render(<PixelText text=" A  B " />);
    const [plain, glyphs] = container.firstElementChild?.children ?? [];

    expect(plain?.textContent).toBe(' A  B ');
    expect([...(glyphs?.children ?? [])].map((word) => word.children.length)).toEqual([0, 1, 0, 1, 0]);
  });

  it('takes extra inline styles, such as its pixel size', () => {
    const { container } = render(<PixelText text="Hi" style={{ color: 'red' }} />);

    expect((container.firstElementChild as HTMLElement).style.color).toBe('red');
  });

  it('spells the ellipsis as three dots', () => {
    const { container } = render(<PixelText text="Wait…" />);
    const glyphs = container.querySelectorAll('[style]');

    expect(glyphs).toHaveLength(7);
    expect((glyphs[6] as HTMLElement).style.getPropertyValue('--shape')).toBe(glyphShape('.'));
  });
});

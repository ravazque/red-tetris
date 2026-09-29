import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PIECE_TYPES } from '../../../shared/game/pieces.ts';
import { createRain, PieceRain } from '../../src/components/PieceRain.tsx';

// Deterministic stand-in for Math.random: cycles through the given values.
const sequence = (...values: number[]) => {
  let i = 0;
  return () => values[i++ % values.length];
};

describe('createRain', () => {
  it.each([
    ['low', sequence(0)],
    ['high', sequence(0.999)],
    ['mixed', sequence(0.1, 0.9, 0.5, 0.3, 0.7, 0.2, 0.8, 0.4, 0.6)],
  ])('spreads the drops apart with %s random values', (_name, random) => {
    const drops = createRain(random);
    const lefts = drops.map(({ left }) => left).sort((a, b) => a - b);
    const delays = drops.map(({ delay }) => delay).sort((a, b) => a - b);

    expect(drops).toHaveLength(5);
    expect(drops.every(({ type }) => PIECE_TYPES.includes(type))).toBe(true);
    expect(lefts[0]).toBeGreaterThanOrEqual(2);
    expect(lefts[4]).toBeLessThanOrEqual(92);
    lefts.slice(1).forEach((left, i) => expect(left - lefts[i]).toBeGreaterThanOrEqual(12));
    delays.slice(1).forEach((delay, i) => expect(delay - delays[i]).toBeGreaterThanOrEqual(1.5));
    expect(drops.every(({ duration }) => duration >= 11 && duration <= 15)).toBe(true);
    expect(drops.every(({ spin }) => Math.abs(spin) === 180)).toBe(true);
  });

  it('changes from one call to the next', () => {
    expect(createRain(sequence(0.1, 0.6, 0.3))).not.toEqual(createRain(sequence(0.8, 0.2, 0.5)));
  });
});

describe('PieceRain', () => {
  it('drops a few decorative pieces, hidden from screen readers', () => {
    render(<PieceRain />);
    const rain = screen.getByTestId('piece-rain');

    expect(rain.getAttribute('aria-hidden')).toBe('true');
    expect(rain.querySelectorAll('[data-piece]')).toHaveLength(5);
  });
});

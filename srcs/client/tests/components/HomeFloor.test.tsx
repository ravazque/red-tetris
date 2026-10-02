import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HomeFloor } from '../../src/components/HomeFloor.tsx';

describe('HomeFloor', () => {
  it('draws depth-indexed rows and columns spread evenly to both sides of the vanishing point', () => {
    render(<HomeFloor />);
    const floor = screen.getByTestId('home-floor');
    const lines = [...floor.children] as HTMLElement[];
    const rows = lines.filter((line) => line.style.getPropertyValue('--i') !== '');
    const columns = lines.map((line) => line.style.getPropertyValue('--j')).filter((j) => j !== '').map(Number);

    expect(floor.getAttribute('aria-hidden')).toBe('true');
    expect(floor.style.getPropertyValue('--rows')).toBe(String(rows.length));
    expect(rows.map((row) => Number(row.style.getPropertyValue('--i')))).toEqual(rows.map((_, i) => i));
    const side = Math.max(...columns);
    expect(side).toBeGreaterThan(0);
    expect(columns).toEqual(Array.from({ length: side * 2 + 1 }, (_, i) => i - side));
  });
});

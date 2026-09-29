import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Spectrum } from '../../src/components/Spectrum.tsx';

const barHeights = () =>
  [...screen.getByLabelText('Spectrum').children].map((column) => (column.firstElementChild as HTMLElement).style.height);

describe('Spectrum', () => {
  it('draws one bar per column, scaled to the board height', () => {
    render(<Spectrum heights={[0, 1, 2, 3, 4, 5, 10, 15, 20, 0]} />);

    expect(barHeights()).toEqual(['0%', '5%', '10%', '15%', '20%', '25%', '50%', '75%', '100%', '0%']);
  });

  it('is flat before the first spectrum arrives', () => {
    render(<Spectrum />);

    expect(barHeights()).toEqual(Array(10).fill('0%'));
  });
});

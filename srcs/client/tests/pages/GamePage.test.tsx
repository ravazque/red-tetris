import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BOARD_HEIGHT, BOARD_WIDTH } from '../../../shared/constants.ts';
import { GamePage } from '../../src/pages/GamePage.tsx';

const renderAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/:room/:player" element={<GamePage />} />
      </Routes>
    </MemoryRouter>,
  );

describe('GamePage', () => {
  it('shows the room and player name from the URL', () => {
    renderAt('/room1/alice');

    expect(screen.getByRole('heading', { name: 'room1' })).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
  });

  it('renders an empty board', () => {
    const { container } = renderAt('/room1/alice');

    expect(container.querySelector('main')?.lastElementChild?.children).toHaveLength(BOARD_WIDTH * BOARD_HEIGHT);
  });
});

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GamePage } from '../../src/pages/GamePage.tsx';

describe('GamePage', () => {
  it('shows the room and player name from the URL', () => {
    render(
      <MemoryRouter initialEntries={['/room1/alice']}>
        <Routes>
          <Route path="/:room/:player" element={<GamePage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByRole('heading', { name: 'room1' })).toBeTruthy();
    expect(screen.getByText('alice')).toBeTruthy();
  });
});

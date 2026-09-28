import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InviteLink } from '../../src/components/InviteLink.tsx';

describe('InviteLink', () => {
  it('shows the room URL and copies it', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<InviteLink room="room1" />);
    const url = `${window.location.origin}/room1`;

    expect(screen.getByText(url)).toBeTruthy();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Copy' }));
    });

    expect(writeText).toHaveBeenCalledWith(url);
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});

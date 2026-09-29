import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { InviteLink } from '../../src/components/InviteLink.tsx';

const writeText = vi.fn(() => Promise.resolve());

const clickCopy = async (name: string) => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name }));
  });
};

describe('InviteLink', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('shows the room code and copies the code or the link', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<InviteLink room="room1" />);
    const url = `${window.location.origin}/room1`;

    expect(screen.getByText('room1')).toBeTruthy();
    expect(screen.getByRole('group', { name: 'Invite a rival' })).toBeTruthy();
    expect(screen.queryByText('Invite a rival')).toBeNull();
    expect(screen.getByRole('button', { name: 'Copy link' }).getAttribute('title')).toBe(url);

    await clickCopy('Copy code');

    expect(writeText).toHaveBeenLastCalledWith('room1');
    expect(screen.getByRole('button', { name: 'Copied' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Copy link' })).toBeTruthy();

    await clickCopy('Copy link');

    expect(writeText).toHaveBeenLastCalledWith(url);
    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
  });

  it('turns Copied back into Copy after a moment', async () => {
    vi.useFakeTimers();
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<InviteLink room="room1" />);

    await clickCopy('Copy code');
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(screen.queryByRole('button', { name: 'Copied' })).toBeNull();
  });

  it('keeps Copy when the clipboard refuses', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    render(<InviteLink room="room1" />);

    await clickCopy('Copy code');

    expect(screen.getByRole('button', { name: 'Copy code' })).toBeTruthy();
  });
});

import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { joinRequested } from '../../src/app/actions.ts';
import { isTouchOnly } from '../../src/app/device.ts';
import { MOBILE_TEXT } from '../../src/texts.ts';
import { renderApp } from '../helpers/render.tsx';

const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const ANDROID_PHONE = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const ANDROID_TABLET = 'Mozilla/5.0 (Linux; Android 15; SM-X910) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const mouse = { coarse: false, fine: true, mobile: false, userAgent: DESKTOP };

// Fake pointer media queries whose answers can change later, like plugging a mouse in.
const pointers = (matches: Record<string, boolean>) => {
  const listeners = new Set<() => void>();
  vi.stubGlobal('matchMedia', (query: string) => ({
    get matches() {
      return matches[query] ?? false;
    },
    addEventListener: (_: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) => listeners.delete(listener),
  }));
  return {
    listeners,
    change: (next: Record<string, boolean>) => {
      Object.assign(matches, next);
      for (const listener of listeners) listener();
    },
  };
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('isTouchOnly', () => {
  it.each([
    ['a computer with a mouse', mouse, false],
    ['a touchscreen laptop', { ...mouse, coarse: true }, false],
    ['an Android tablet with a mouse', { ...mouse, userAgent: ANDROID_TABLET }, false],
    ['an iPad without a mouse, with a desktop agent', { coarse: true, fine: false, mobile: false, userAgent: IPAD }, true],
    ['an iPhone', { ...mouse, userAgent: IPHONE }, true],
    ['an Android phone', { ...mouse, userAgent: ANDROID_PHONE }, true],
    ['a browser flagged mobile by its client hints', { ...mouse, mobile: true }, true],
  ])('%s: %s', (_, hints, expected) => {
    expect(isTouchOnly(hints)).toBe(expected);
  });
});

describe('App on a touch-only device', () => {
  it('shows the notice over an inert home screen and never joins the room of the link', () => {
    pointers({ '(pointer: coarse)': true, '(any-pointer: fine)': false });
    const { actions, container } = renderApp('/room1/alice');

    expect(screen.getByRole('alertdialog', { name: MOBILE_TEXT.title }).textContent).toContain(MOBILE_TEXT.body);
    expect(container.querySelector('[inert]')?.contains(screen.getByLabelText('Player name'))).toBe(true);
    expect(screen.queryByTestId('board')).toBeNull();
    expect(actions.some(({ type }) => type === joinRequested.type)).toBe(false);
  });

  it('lifts the notice when a mouse shows up and lets the link join', () => {
    const media = pointers({ '(pointer: coarse)': true, '(any-pointer: fine)': false });
    const { actions, unmount } = renderApp('/room1/alice');

    act(() => {
      media.change({ '(any-pointer: fine)': true });
    });

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(actions).toContainEqual(joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'versus' }));

    unmount();

    expect(media.listeners.size).toBe(0);
  });

  it('leaves computers alone', () => {
    pointers({ '(pointer: coarse)': false, '(any-pointer: fine)': true });
    renderApp('/');

    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.getByLabelText('Player name')).toBeTruthy();
  });
});

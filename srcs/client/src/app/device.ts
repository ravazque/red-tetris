import { useSyncExternalStore } from 'react';

// Red Tetris is a keyboard game for computer screens (HD to 4K): phones and tablets without a mouse get a notice instead.
export interface DeviceHints {
  readonly coarse: boolean;
  readonly fine: boolean;
  readonly mobile: boolean;
  readonly userAgent: string;
}

const PHONE_AGENT = /iPhone|iPod|Android.+Mobile|Windows Phone|IEMobile|Opera Mini/i;
const COARSE = '(pointer: coarse)';
const FINE = '(any-pointer: fine)';

// Touchscreen laptops keep a fine pointer (trackpad or mouse), so only finger-only devices and phones count.
export const isTouchOnly = ({ coarse, fine, mobile, userAgent }: DeviceHints) => mobile || PHONE_AGENT.test(userAgent) || (coarse && !fine);

const readDevice = () =>
  typeof matchMedia === 'function' &&
  isTouchOnly({
    coarse: matchMedia(COARSE).matches,
    fine: matchMedia(FINE).matches,
    mobile: (navigator as Navigator & { userAgentData?: { mobile?: boolean } }).userAgentData?.mobile === true,
    userAgent: navigator.userAgent,
  });

const subscribe = (onChange: () => void) => {
  if (typeof matchMedia !== 'function') return () => {};
  const lists = [COARSE, FINE].map((query) => matchMedia(query));
  for (const list of lists) list.addEventListener('change', onChange);
  return () => {
    for (const list of lists) list.removeEventListener('change', onChange);
  };
};

export const useTouchOnly = () => useSyncExternalStore(subscribe, readDevice);

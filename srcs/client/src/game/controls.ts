import { useEffect, useRef } from 'react';
import type { GameAction } from '../../../shared/constants.ts';
import { inputRequested } from '../app/actions.ts';
import { useAppDispatch } from '../app/hooks.ts';

export const KEY_ACTIONS: Readonly<Record<string, GameAction>> = {
  ArrowLeft: 'move_left',
  ArrowRight: 'move_right',
  ArrowUp: 'rotate',
  ArrowDown: 'soft_drop',
  Space: 'hard_drop',
};

const NO_REPEAT: ReadonlySet<GameAction> = new Set(['rotate', 'hard_drop']);

// Keyboard to game:input while enabled; held keys repeat moves and soft drops. Sequences only grow, so each round's first input is ahead of its 0.
export const useControls = (roomId: string, enabled: boolean) => {
  const dispatch = useAppDispatch();
  const sequence = useRef(0);

  useEffect(() => {
    if (!enabled) return;
    const onKey = (event: KeyboardEvent) => {
      const action = KEY_ACTIONS[event.code];
      if (!action) return;
      event.preventDefault();
      if (event.type !== 'keydown' || (event.repeat && NO_REPEAT.has(action))) return;
      sequence.current += 1;
      dispatch(inputRequested({ roomId, action, sequence: sequence.current }));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [dispatch, roomId, enabled]);
};

import { useEffect, useRef } from 'react';
import type { GameAction } from '../../../shared/constants.ts';
import type { PaddleDirection } from '../../../shared/game/pontrix.ts';
import { inputRequested, paddleInputRequested } from '../app/actions.ts';
import { useAppDispatch } from '../app/hooks.ts';

export const KEY_ACTIONS: Readonly<Record<string, GameAction>> = {
  ArrowLeft: 'move_left',
  ArrowRight: 'move_right',
  ArrowUp: 'rotate',
  ArrowDown: 'soft_drop',
  Space: 'hard_drop',
};

const PADDLE_DIRECTIONS: Readonly<Record<string, PaddleDirection>> = { KeyW: -1, KeyS: 1 };

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

export const usePaddleControls = (roomId: string, enabled: boolean) => {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!enabled) return;
    const pressed = new Set<string>();
    const onKey = (event: KeyboardEvent) => {
      const direction = PADDLE_DIRECTIONS[event.code];
      if (direction === undefined) return;
      event.preventDefault();
      if (event.type === 'keydown') {
        if (event.repeat) return;
        pressed.add(event.code);
      } else {
        pressed.delete(event.code);
      }
      const current = pressed.has('KeyW') ? -1 : pressed.has('KeyS') ? 1 : 0;
      dispatch(paddleInputRequested({ roomId, direction: current }));
    };
    const release = () => {
      pressed.clear();
      dispatch(paddleInputRequested({ roomId, direction: 0 }));
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    window.addEventListener('blur', release);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('blur', release);
    };
  }, [dispatch, roomId, enabled]);
};

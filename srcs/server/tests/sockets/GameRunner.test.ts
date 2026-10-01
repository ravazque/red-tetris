import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGame } from '../../src/domain/Game.ts';
import { RoomLifecycle } from '../../src/rooms/RoomLifecycle.ts';
import { RoomManager } from '../../src/rooms/RoomManager.ts';
import { GameRunner } from '../../src/sockets/GameRunner.ts';
import type { IoServer } from '../../src/sockets/registerHandlers.ts';

interface Emitted {
  readonly event: string;
  readonly payload: unknown;
  readonly except: string | null;
}

// Records io.to(room)[.except(socket)].emit(...) calls; room:state goes to sockets that do not exist here.
const fakeIo = () => {
  const emitted: Emitted[] = [];
  const operator = (except: string | null) => ({
    emit: (event: string, payload: unknown) => emitted.push({ event, payload, except }),
    except: (socketId: string) => operator(socketId),
  });
  const io = { to: () => operator(null), sockets: { sockets: new Map() } } as unknown as IoServer;
  return { io, emitted };
};

const setup = (tickMs = 1000) => {
  let nextId = 1;
  const rooms = new RoomManager(() => `player-${nextId++}`);
  const lifecycle = new RoomLifecycle(rooms, createGame);
  const { io, emitted } = fakeIo();
  const runner = new GameRunner(io, rooms, lifecycle, tickMs);
  rooms.join('room-1', 'Alice', 'socket-1', 'versus');
  rooms.join('room-1', 'Bobby', 'socket-2');
  lifecycle.start('room-1', 'socket-2');
  const { game } = lifecycle.start('room-1', 'socket-1');
  if (!game) throw new Error('the round did not start');
  return { rooms, lifecycle, runner, game, emitted };
};

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('GameRunner', () => {
  it('sends the first boards and spectrums to the whole room', () => {
    const { runner, emitted } = setup();

    runner.start('room-1');

    expect(emitted.filter(({ event }) => event === 'game:state')).toHaveLength(2);
    expect(emitted.filter(({ event }) => event === 'game:spectrum').map(({ except }) => except)).toEqual([null, null]);
    runner.stop('room-1');
  });

  it('broadcasts penalties and eliminations, then finishes the room', () => {
    const { rooms, runner, game, emitted } = setup();
    vi.spyOn(game, 'applyInput').mockReturnValue([
      { type: 'penalty', sourcePlayerId: 'player-1', targetPlayerId: 'player-2', lines: 2 },
      { type: 'eliminated', playerId: 'player-2', reason: 'topout' },
      { type: 'finished', winnerPlayerId: 'player-1', reason: 'topout' },
    ]);

    const revision = rooms.getRoom('room-1')?.revision ?? -1;

    runner.input('room-1', 'player-1', 'hard_drop', 1);

    expect(emitted.map(({ event }) => event)).toEqual(['game:penalty', 'game:player_eliminated', 'game:finished']);
    expect(emitted[0].payload).toEqual({ roomId: 'room-1', revision, sourcePlayerId: 'player-1', targetPlayerId: 'player-2', lines: 2 });
    expect(emitted[2].payload).toEqual({ roomId: 'room-1', revision: revision + 1, winnerPlayerId: 'player-1', reason: 'topout' });
    expect(rooms.getRoom('room-1')?.phase).toBe('finished');
  });

  it('ticks on its interval and stops once the room is gone', () => {
    vi.useFakeTimers();
    const { rooms, runner, game, emitted } = setup(100);
    const tick = vi.spyOn(game, 'tick');
    runner.start('room-1');

    vi.advanceTimersByTime(250);
    expect(tick).toHaveBeenCalledTimes(2);

    rooms.leave('socket-1');
    rooms.leave('socket-2');
    emitted.length = 0;
    vi.advanceTimersByTime(500);

    expect(tick).toHaveBeenCalledTimes(3);
    expect(emitted).toEqual([]);
  });

  it('ignores rooms without a game and players outside it', () => {
    const { runner, emitted } = setup();

    runner.start('room-9');
    runner.input('room-9', 'player-1', 'rotate', 1);
    runner.removePlayer('room-1', 'player-9');

    expect(emitted).toEqual([]);
  });
});

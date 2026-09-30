import { describe, expect, it } from 'vitest';
import type { Game, GameSetup } from '../../src/domain/Game.ts';
import { RoomLifecycle } from '../../src/rooms/RoomLifecycle.ts';
import { RoomManager, RoomManagerError } from '../../src/rooms/RoomManager.ts';

const createManager = () => {
  let nextPlayerId = 1;
  return new RoomManager(() => `player-${nextPlayerId++}`);
};

const expectError = (operation: () => unknown, code: string) => {
  let caught: unknown;
  try {
    operation();
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(RoomManagerError);
  expect(caught).toMatchObject({ code });
};

const createGameFactory = () => {
  const games: Game[] = [];
  return {
    games,
    create: (setup: GameSetup) => {
      const game = { roomId: setup.roomId, playerIds: [...setup.playerIds] };
      games.push(game);
      return game;
    },
  };
};

describe('RoomLifecycle', () => {
  it('starts a waiting room through the host and creates one game session', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'solo');
    const lifecycle = new RoomLifecycle(rooms, factory.create);

    const result = lifecycle.start('room-1', 'socket-1');

    expect(result.room).toMatchObject({ phase: 'running', revision: 2, mode: 'solo' });
    expect(result.game).toEqual({ roomId: 'room-1', playerIds: ['player-1'] });
    expect(factory.games).toHaveLength(1);
    expect(lifecycle.getGame('room-1')).toBe(result.game);
  });

  it('enforces host, phase and Pon-Trix player requirements', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    rooms.join('room-1', 'Bobby', 'socket-2');
    const lifecycle = new RoomLifecycle(rooms, factory.create);

    expectError(() => lifecycle.start('room-1', 'socket-2'), 'UNAUTHORIZED');
    expect(factory.games).toHaveLength(0);
    lifecycle.start('room-1', 'socket-1');
    expectError(() => lifecycle.start('room-1', 'socket-1'), 'INVALID_PHASE');

    const pontrix = createManager();
    pontrix.join('room-2', 'Alice', 'socket-1', 'pontrix');
    const pontrixLifecycle = new RoomLifecycle(pontrix, factory.create);
    expectError(() => pontrixLifecycle.start('room-2', 'socket-1'), 'NOT_ENOUGH_PLAYERS');
  });

  it('restarts a finished room directly into a new running session', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    const lifecycle = new RoomLifecycle(rooms, factory.create);
    const first = lifecycle.start('room-1', 'socket-1');
    rooms.transitionPhase('room-1', 'socket-1', 'finished');

    const restarted = lifecycle.restart('room-1', 'socket-1');

    expect(restarted.room).toMatchObject({ phase: 'running', revision: 4 });
    expect(restarted.game).not.toBe(first.game);
    expect(factory.games).toHaveLength(2);
  });

  it('removes a room session when the room is deleted', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'solo');
    const lifecycle = new RoomLifecycle(rooms, factory.create);
    lifecycle.start('room-1', 'socket-1');
    lifecycle.remove('room-1');

    expect(lifecycle.getGame('room-1')).toBeNull();
  });
});

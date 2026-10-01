import { describe, expect, it } from 'vitest';
import { Game, type GameSetup } from '../../src/domain/Game.ts';
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
      const game = new Game(setup);
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
    expect(result.game).toMatchObject({ roomId: 'room-1', playerIds: ['player-1'] });
    expect(factory.games).toHaveLength(1);
    expect(lifecycle.getGame('room-1')).toBe(result.game);
  });

  it('lets the host start a duel once the guest pressed Ready', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    rooms.join('room-1', 'Bobby', 'socket-2');
    const lifecycle = new RoomLifecycle(rooms, factory.create);

    expectError(() => lifecycle.start('room-1', 'socket-1'), 'NOT_READY');
    const ready = lifecycle.start('room-1', 'socket-2');
    expect(ready.game).toBeNull();
    expect(ready.room.phase).toBe('waiting');
    expect(lifecycle.isReady('room-1', 'player-2')).toBe(true);
    expect(lifecycle.start('room-1', 'socket-2').game).toBeNull();
    expect(factory.games).toHaveLength(0);

    const started = lifecycle.start('room-1', 'socket-1');
    expect(started.game).toMatchObject({ playerIds: ['player-1', 'player-2'] });
    expect(started.room.phase).toBe('running');
    expect(lifecycle.isReady('room-1', 'player-2')).toBe(false);
    expectError(() => lifecycle.start('room-1', 'socket-1'), 'INVALID_PHASE');
  });

  it('needs two players in versus and Pon-Trix, and a member socket', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    rooms.join('room-2', 'Alice', 'socket-2', 'pontrix');
    const lifecycle = new RoomLifecycle(rooms, factory.create);

    expectError(() => lifecycle.start('room-1', 'socket-1'), 'NOT_ENOUGH_PLAYERS');
    expectError(() => lifecycle.start('room-2', 'socket-2'), 'NOT_ENOUGH_PLAYERS');
    expectError(() => lifecycle.start('room-1', 'socket-9'), 'UNAUTHORIZED');
    expectError(() => lifecycle.start('room-9', 'socket-1'), 'INVALID_ROOM');
    expect(factory.games).toHaveLength(0);
  });

  it('restarts a finished duel into a new session: guest Ready, then the host restarts', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    rooms.join('room-1', 'Bobby', 'socket-2');
    const lifecycle = new RoomLifecycle(rooms, factory.create);
    lifecycle.start('room-1', 'socket-2');
    const first = lifecycle.start('room-1', 'socket-1');
    expectError(() => lifecycle.restart('room-1', 'socket-1'), 'INVALID_PHASE');
    rooms.advance('room-1', 'finished');

    expectError(() => lifecycle.restart('room-1', 'socket-1'), 'NOT_READY');
    expect(lifecycle.restart('room-1', 'socket-2').game).toBeNull();
    const restarted = lifecycle.restart('room-1', 'socket-1');

    expect(restarted.room).toMatchObject({ phase: 'running' });
    expect(restarted.game).not.toBe(first.game);
    expect(lifecycle.getGame('room-1')).toBe(restarted.game);
    expect(factory.games).toHaveLength(2);
  });

  it('forgets who was ready when the seats change', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    rooms.join('room-1', 'Bobby', 'socket-2');
    const lifecycle = new RoomLifecycle(rooms, factory.create);
    lifecycle.start('room-1', 'socket-2');
    lifecycle.unready('room-1', 'player-9');
    expect(lifecycle.isReady('room-1', 'player-2')).toBe(true);

    lifecycle.clearReady('room-1');

    expect(lifecycle.isReady('room-1', 'player-2')).toBe(false);
  });

  it('starts no round in a closed room', () => {
    const rooms = createManager();
    const factory = createGameFactory();
    rooms.join('room-1', 'Alice', 'socket-1', 'versus');
    rooms.join('room-1', 'Bobby', 'socket-2');
    const lifecycle = new RoomLifecycle(rooms, factory.create);
    rooms.close('room-1', { playerName: 'Carol', reason: 'left' });

    expectError(() => lifecycle.start('room-1', 'socket-1'), 'ROOM_CLOSED');
    expectError(() => lifecycle.restart('room-1', 'socket-2'), 'ROOM_CLOSED');
    expect(factory.games).toHaveLength(0);
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

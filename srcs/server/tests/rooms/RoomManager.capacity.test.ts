import { describe, expect, it } from 'vitest';
import { MAX_PLAYERS_PER_ROOM } from '../../../shared/constants.ts';
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

// Room with two players: Alice (host, socket-1) and Bob (socket-2).
const createFullRoom = () => {
  const manager = createManager();
  manager.join('room-1', 'Alice', 'socket-1');
  manager.join('room-1', 'Bob', 'socket-2');
  return manager;
};

describe('RoomManager capacity', () => {
  it('allows at most two players per room', () => {
    expect(MAX_PLAYERS_PER_ROOM).toBe(2);
  });

  it('rejects a third player and leaves the room unchanged', () => {
    const manager = createFullRoom();
    const before = manager.getRoom('room-1');

    expectError(() => manager.join('room-1', 'Carol', 'socket-3'), 'ROOM_FULL');

    expect(manager.getRoom('room-1')).toEqual(before);
    expect(manager.getRoomForSocket('socket-3')).toBeNull();
  });

  it('lets a rejected socket join another room', () => {
    const manager = createFullRoom();
    expectError(() => manager.join('room-1', 'Carol', 'socket-3'), 'ROOM_FULL');

    const result = manager.join('room-2', 'Carol', 'socket-3');

    expect(result.member).toMatchObject({ name: 'Carol' });
  });

  it('rejects a third player in a finished room', () => {
    const manager = createFullRoom();
    manager.transitionPhase('room-1', 'socket-1', 'running');
    manager.transitionPhase('room-1', 'socket-1', 'finished');

    expectError(() => manager.join('room-1', 'Carol', 'socket-3'), 'ROOM_FULL');
  });

  it('reports ROOM_RUNNING before ROOM_FULL', () => {
    const manager = createFullRoom();
    manager.transitionPhase('room-1', 'socket-1', 'running');

    expectError(() => manager.join('room-1', 'Carol', 'socket-3'), 'ROOM_RUNNING');
  });

  it('frees the slot when a player leaves', () => {
    const manager = createFullRoom();
    manager.leave('socket-2');

    const result = manager.join('room-1', 'Carol', 'socket-3');

    expect(result.room.members).toHaveLength(2);
  });

  it('accepts a second player in a finished solo room', () => {
    const manager = createManager();
    manager.join('room-1', 'Alice', 'socket-1');
    manager.transitionPhase('room-1', 'socket-1', 'running');
    manager.transitionPhase('room-1', 'socket-1', 'finished');

    const result = manager.join('room-1', 'Bob', 'socket-2');

    expect(result.room).toMatchObject({ phase: 'finished', hostPlayerId: 'player-1' });
    expect(result.room.members).toHaveLength(2);
  });
});

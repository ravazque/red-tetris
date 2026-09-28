import { describe, expect, it } from 'vitest';
import {
  RoomManager,
  RoomManagerError,
  type RoomSnapshot,
} from '../../src/rooms/RoomManager.ts';

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

describe('RoomManager', () => {
  it('creates a room and assigns the first player as host', () => {
    const manager = createManager();

    const result = manager.join('room-1', 'Alice', 'socket-1');

    expect(result.room).toMatchObject({
      roomId: 'room-1',
      phase: 'waiting',
      revision: 1,
      hostPlayerId: 'player-1',
    });
    expect(result.member).toMatchObject({
      playerId: 'player-1',
      name: 'Alice',
      socketId: 'socket-1',
    });
  });

  it('adds players and keeps socket membership indexed', () => {
    const manager = createManager();

    manager.join('room-1', 'Alice', 'socket-1');
    const second = manager.join('room-1', 'Bob', 'socket-2');

    expect(second.room.revision).toBe(2);
    expect(second.room.members).toHaveLength(2);
    expect(second.room.hostPlayerId).toBe('player-1');
    expect(manager.getRoomForSocket('socket-2')).toEqual(second.room);
  });

  it('rejects empty identifiers and duplicate socket membership', () => {
    const manager = createManager();

    expectError(() => manager.join('', 'Alice', 'socket-1'), 'INVALID_PAYLOAD');
    expectError(() => manager.join('room-1', '', 'socket-1'), 'INVALID_PAYLOAD');
    manager.join('room-1', 'Alice', 'socket-1');
    expectError(() => manager.join('room-2', 'Bob', 'socket-1'), 'INVALID_PLAYER');
  });

  it('rejects a new player after the room starts running', () => {
    const manager = createManager();
    manager.join('room-1', 'Alice', 'socket-1');

    const running = manager.transitionPhase('room-1', 'socket-1', 'running');

    expect(running).toMatchObject({ phase: 'running', revision: 2 });
    expectError(() => manager.join('room-1', 'Bob', 'socket-2'), 'ROOM_RUNNING');
  });

  it('requires the host to change the room phase', () => {
    const manager = createManager();
    manager.join('room-1', 'Alice', 'socket-1');
    manager.join('room-1', 'Bob', 'socket-2');

    expectError(
      () => manager.transitionPhase('room-1', 'socket-2', 'running'),
      'UNAUTHORIZED',
    );
    expectError(
      () => manager.transitionPhase('unknown', 'socket-1', 'running'),
      'INVALID_ROOM',
    );
    expectError(
      () => manager.transitionPhase('room-1', 'socket-3', 'running'),
      'INVALID_PLAYER',
    );
  });

  it('allows only the defined phase transitions', () => {
    const manager = createManager();
    manager.join('room-1', 'Alice', 'socket-1');

    expectError(
      () => manager.transitionPhase('room-1', 'socket-1', 'finished'),
      'INVALID_PHASE',
    );
    manager.transitionPhase('room-1', 'socket-1', 'running');
    manager.transitionPhase('room-1', 'socket-1', 'finished');
    const waiting = manager.transitionPhase('room-1', 'socket-1', 'waiting');

    expect(waiting).toMatchObject({ phase: 'waiting', revision: 4 });
    expect(manager.transitionPhase('room-1', 'socket-1', 'waiting')).toEqual(waiting);
  });

  it('transfers the host when the current host leaves', () => {
    const manager = createManager();
    manager.join('room-1', 'Alice', 'socket-1');
    manager.join('room-1', 'Bob', 'socket-2');

    const result = manager.leave('socket-1');

    expect(result).toMatchObject({ hostChanged: true, roomDeleted: false });
    expect(result?.room).toMatchObject({ hostPlayerId: 'player-2', revision: 3 });
    expect(result!.room!.hostPlayerId).toBe('player-2');
    expect(manager.getRoomForSocket('socket-1')).toBeNull();
  });

  it('deletes empty rooms and makes repeated disconnects harmless', () => {
    const manager = createManager();
    manager.join('room-1', 'Alice', 'socket-1');

    const result = manager.leave('socket-1');

    expect(result).toMatchObject({ hostChanged: false, roomDeleted: true, room: null });
    expect(manager.getRoom('room-1')).toBeNull();
    expect(manager.leave('socket-1')).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { RoomManager, RoomManagerError } from '../../src/rooms/RoomManager.ts';

const createManager = () => {
  let nextPlayerId = 1;
  const manager = new RoomManager(() => `player-${nextPlayerId++}`);
  manager.join('room-1', 'Alice', 'socket-1', 'versus');
  manager.join('room-1', 'Bobby', 'socket-2');
  return manager;
};

const codeOf = (operation: () => unknown) => {
  try {
    operation();
  } catch (error) {
    return error instanceof RoomManagerError ? error.code : 'other';
  }
  return null;
};

// A dropped socket keeps its seat until removeHeld; the same name rejoining takes it back.
describe('RoomManager reconnection', () => {
  it('holds the seat of a dropped socket', () => {
    const manager = createManager();

    const held = manager.disconnect('socket-2');

    expect(held?.member).toMatchObject({ playerId: 'player-2', connected: false });
    expect(held?.room.members.map(({ connected }) => connected)).toEqual([true, false]);
    expect(manager.getRoomForSocket('socket-2')).toBeNull();
    expect(manager.disconnect('socket-2')).toBeNull();
  });

  it('gives the held seat back to the same name, with the same id, even while running', () => {
    const manager = createManager();
    manager.transitionPhase('room-1', 'socket-1', 'running');
    manager.disconnect('socket-2');

    const back = manager.join('room-1', 'Bobby', 'socket-3');

    expect(back).toMatchObject({ reclaimed: true, member: { playerId: 'player-2', socketId: 'socket-3', connected: true } });
    expect(manager.getRoomForSocket('socket-3')?.roomId).toBe('room-1');
    expect(codeOf(() => manager.join('room-1', 'Carol', 'socket-4'))).toBe('ROOM_RUNNING');
  });

  it('keeps the held seat out of reach of other names', () => {
    const manager = createManager();
    manager.disconnect('socket-2');

    expect(codeOf(() => manager.join('room-1', 'Carol', 'socket-3'))).toBe('ROOM_FULL');
    expect(codeOf(() => manager.join('room-1', 'Alice', 'socket-3'))).toBe('ROOM_FULL');
  });

  it('frees a held seat after the grace and hands the host role over', () => {
    const manager = createManager();
    manager.disconnect('socket-1');

    const freed = manager.removeHeld('room-1', 'player-1');

    expect(freed).toMatchObject({ hostChanged: true, room: { hostPlayerId: 'player-2', members: [{ name: 'Bobby' }] } });
    expect(manager.removeHeld('room-1', 'player-1')).toBeNull();
  });

  it('leaves a reclaimed seat alone when the grace ends', () => {
    const manager = createManager();
    manager.disconnect('socket-2');
    manager.join('room-1', 'Bobby', 'socket-3');

    expect(manager.removeHeld('room-1', 'player-2')).toBeNull();
    expect(manager.removeHeld('room-9', 'player-2')).toBeNull();
    expect(manager.getRoom('room-1')?.members).toHaveLength(2);
  });

  it('deletes the room when its last held seat is freed', () => {
    const manager = new RoomManager(() => 'player-1');
    manager.join('room-1', 'Alice', 'socket-1', 'solo');
    manager.disconnect('socket-1');

    expect(manager.removeHeld('room-1', 'player-1')).toMatchObject({ room: null, roomDeleted: true });
    expect(manager.getRoom('room-1')).toBeNull();
  });

  it('closes a room for good: finished, no new names, but a held seat can still come back', () => {
    const manager = createManager();
    manager.disconnect('socket-2');

    const closed = manager.close('room-1', { playerName: 'Carol', reason: 'timeout' });

    expect(closed).toMatchObject({ phase: 'finished', closed: { playerName: 'Carol', reason: 'timeout' } });
    expect(codeOf(() => manager.join('room-1', 'Dave', 'socket-3'))).toBe('ROOM_CLOSED');
    expect(manager.join('room-1', 'Bobby', 'socket-3')).toMatchObject({ reclaimed: true });
  });
});

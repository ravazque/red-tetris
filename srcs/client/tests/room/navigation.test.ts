import { describe, expect, it } from 'vitest';
import { createRoomId, isValidName, locationMode, roomPath } from '../../src/room/navigation.ts';

describe('isValidName', () => {
  it.each(['abcd', 'Alice', 'room_1', 'x-y_', 'A'.repeat(16)])('accepts %j', (name) => {
    expect(isValidName(name)).toBe(true);
  });

  it.each(['', 'abc', 'A'.repeat(17), 'two words', 'ñandú', 'a/b', 'a.b', ' alice'])('rejects %j', (name) => {
    expect(isValidName(name)).toBe(false);
  });
});

describe('createRoomId', () => {
  it('returns a valid 8-character room name', () => {
    const id = createRoomId();

    expect(id).toHaveLength(8);
    expect(isValidName(id)).toBe(true);
  });

  it('returns a different id on each call', () => {
    expect(createRoomId()).not.toBe(createRoomId());
  });
});

describe('roomPath', () => {
  it('builds the game URL', () => {
    expect(roomPath('room1', 'alice')).toBe('/room1/alice');
  });
});

describe('locationMode', () => {
  it('reads the mode from the router state', () => {
    expect(locationMode({ mode: 'solo' })).toBe('solo');
    expect(locationMode({ mode: 'pontrix' })).toBe('pontrix');
  });

  it('falls back to versus for a reload, an invite link or a bad state', () => {
    expect(locationMode(null)).toBe('versus');
    expect(locationMode({ mode: 'battle' })).toBe('versus');
  });
});

import { describe, expect, it } from 'vitest';
import {
  createRoomId,
  isJoinLocation,
  isValidName,
  locationMode,
  locationRejected,
  locationRule,
  resolvePath,
  roomPath,
} from '../../src/room/navigation.ts';

describe('isValidName', () => {
  it.each(['abc', 'Alice', 'room_1', 'x-y_', 'A'.repeat(12)])('accepts %j', (name) => {
    expect(isValidName(name)).toBe(true);
  });

  it.each(['', 'ab', 'A'.repeat(13), 'two words', 'ñandú', 'a/b', 'a.b', ' alice'])('rejects %j', (name) => {
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

describe('isJoinLocation', () => {
  it('is true only for the home Join state', () => {
    expect(isJoinLocation({ join: true })).toBe(true);
    expect(isJoinLocation({ mode: 'versus' })).toBe(false);
    expect(isJoinLocation(null)).toBe(false);
  });
});

describe('locationRule', () => {
  it('reads a known rule from the router state', () => {
    expect(locationRule({ mode: 'versus', rule: 'score' })).toBe('score');
    expect(locationRule({ rule: 'sudden' })).toBeUndefined();
    expect(locationRule(null)).toBeUndefined();
  });
});

describe('locationRejected', () => {
  it('reads the rejected room and player from the router state', () => {
    expect(locationRejected({ player: 'ab', room: 'room1' })).toEqual({ player: 'ab', room: 'room1' });
    expect(locationRejected({ room: 'ab' })).toEqual({ room: 'ab' });
  });

  it('keeps the server error code of a refused join', () => {
    expect(locationRejected({ player: 'alice', room: 'room1', code: 'ROOM_FULL' })).toEqual({ player: 'alice', room: 'room1', code: 'ROOM_FULL' });
  });

  it('ignores a missing or partial state', () => {
    expect(locationRejected(null)).toBeNull();
    expect(locationRejected({ mode: 'solo' })).toBeNull();
    expect(locationRejected({ player: 'ab' })).toBeNull();
  });
});

describe('resolvePath', () => {
  it.each([
    ['/', '/'],
    ['/room1', '/room1'],
    ['/room1/', '/room1'],
    ['/a84283d0/ravazque', '/a84283d0/ravazque'],
    ['/a84283d0/ravazque/', '/a84283d0/ravazque'],
    ['/%61bc/alice', '/abc/alice'],
  ])('keeps %j playable as %j', (pathname, path) => {
    expect(resolvePath(pathname)).toEqual({ path, rejected: null });
  });

  it.each([
    ['/a84283d0/ravazqueeeeeeeeeeeeeeeeeeeeeeeeeee', { room: 'a84283d0', player: 'ravazqueeeeeeeeeeeeeeeeeeeeeeeeeee' }],
    ['/room1/ab', { room: 'room1', player: 'ab' }],
    ['/two%20words/alice', { room: 'two words', player: 'alice' }],
    ['/ab', { room: 'ab' }],
    ['/index.html', { room: 'index.html' }],
  ])('sends %j to / with the values to fix', (pathname, rejected) => {
    expect(resolvePath(pathname)).toEqual({ path: '/', rejected });
  });

  it.each(['/a84283d0/ravazque/aaaaaaaaaaaa', '/a/b/c/d/e', '//a84283d0', '/a84283d0//ravazque', '/room1/alice//', '/%E0%A4%A'])(
    'sends the impossible %j to a clean /',
    (pathname) => {
      expect(resolvePath(pathname)).toEqual({ path: '/', rejected: null });
    },
  );
});

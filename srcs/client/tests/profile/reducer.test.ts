import { describe, expect, it } from 'vitest';
import { joinRequested, leaveRequested } from '../../src/app/actions.ts';
import { profileReducer } from '../../src/profile/reducer.ts';

const joined = profileReducer(undefined, joinRequested({ roomId: 'room1', playerName: 'alice', mode: 'versus' }));

describe('profileReducer', () => {
  it('starts without a name', () => {
    expect(profileReducer(undefined, { type: 'test/unknown' })).toEqual({ playerName: '' });
  });

  it('keeps the name of the last join, also after leaving', () => {
    expect(joined).toEqual({ playerName: 'alice' });
    expect(profileReducer(joined, leaveRequested({ roomId: 'room1' }))).toBe(joined);
  });
});

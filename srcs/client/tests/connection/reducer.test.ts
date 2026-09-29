import { describe, expect, it } from 'vitest';
import { connectionChanged } from '../../src/app/actions.ts';
import { connectionReducer } from '../../src/connection/reducer.ts';

describe('connectionReducer', () => {
  it('starts online and follows the socket', () => {
    const offline = connectionReducer(undefined, connectionChanged(false));

    expect(connectionReducer(undefined, { type: 'test/unknown' })).toEqual({ online: true });
    expect(offline).toEqual({ online: false });
    expect(connectionReducer(offline, connectionChanged(true))).toEqual({ online: true });
  });
});

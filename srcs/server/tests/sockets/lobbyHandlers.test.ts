import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { RoomErrorPayload, RoomStatePayload } from '../../../shared/types.ts';
import { connectClient, startSocketServer, type TestClient } from '../helpers/socketServer.ts';

const waitForEvent = <T>(client: TestClient, event: 'room:state' | 'room:error' | 'host:changed') =>
  new Promise<T>((resolve) => {
    if (event === 'room:state') client.once(event, resolve as (payload: RoomStatePayload) => void);
    else if (event === 'room:error') client.once(event, resolve as (payload: RoomErrorPayload) => void);
    else client.once(event, resolve as (payload: { playerId: string; playerName: string }) => void);
  });

describe('lobby handlers', () => {
  let server: Awaited<ReturnType<typeof startSocketServer>>;
  const clients: TestClient[] = [];
  let roomNumber = 0;

  beforeAll(async () => {
    server = await startSocketServer();
  });

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
  });

  afterAll(() => server.close());

  const createClient = async () => {
    const client = await connectClient(server.url);
    clients.push(client);
    return client;
  };

  const nextRoom = () => `room-${++roomNumber}`;

  it('creates a room, assigns a host and personalizes room state', async () => {
    const first = await createClient();
    const firstState = waitForEvent<RoomStatePayload>(first, 'room:state');

    first.emit('room:join', { roomId: nextRoom(), playerName: 'Alice', mode: 'solo' });

    await expect(firstState).resolves.toMatchObject({
      phase: 'waiting',
      mode: 'solo',
      selfPlayerId: expect.any(String),
      hostPlayerId: expect.any(String),
      players: [{ name: 'Alice', isAlive: true }],
    });
  });

  it('keeps the existing mode and rejects a second player in solo', async () => {
    const first = await createClient();
    const roomId = nextRoom();
    const firstState = waitForEvent<RoomStatePayload>(first, 'room:state');
    first.emit('room:join', { roomId, playerName: 'Alice', mode: 'solo' });
    await firstState;

    const second = await createClient();
    const error = waitForEvent<RoomErrorPayload>(second, 'room:error');
    second.emit('room:join', { roomId, playerName: 'Bobby', mode: 'versus' });

    await expect(error).resolves.toMatchObject({ code: 'ROOM_FULL', event: 'room:join', roomId });
  });

  it('keeps versus capacity when a joining client supplies another mode', async () => {
    const first = await createClient();
    const second = await createClient();
    const roomId = nextRoom();
    const firstState = waitForEvent<RoomStatePayload>(first, 'room:state');
    first.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    await firstState;

    const secondState = waitForEvent<RoomStatePayload>(second, 'room:state');
    second.emit('room:join', { roomId, playerName: 'Bobby', mode: 'solo' });

    await expect(secondState).resolves.toMatchObject({ mode: 'versus', players: [{ name: 'Alice' }, { name: 'Bobby' }] });
  });

  it('rejects a mode-less join to an unknown room', async () => {
    const client = await createClient();
    const error = waitForEvent<RoomErrorPayload>(client, 'room:error');

    client.emit('room:join', { roomId: nextRoom(), playerName: 'Alice' });

    await expect(error).resolves.toMatchObject({ code: 'ROOM_NOT_FOUND', event: 'room:join' });
  });

  it('broadcasts both players with a different self identity', async () => {
    const first = await createClient();
    const second = await createClient();
    const roomId = nextRoom();

    const firstInitialState = waitForEvent<RoomStatePayload>(first, 'room:state');
    first.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    const firstJoined = await firstInitialState;

    const firstUpdatedState = waitForEvent<RoomStatePayload>(first, 'room:state');
    const secondState = waitForEvent<RoomStatePayload>(second, 'room:state');
    second.emit('room:join', { roomId, playerName: 'Bobby' });

    const [firstUpdated, secondJoined] = await Promise.all([firstUpdatedState, secondState]);
    expect(firstUpdated.players).toHaveLength(2);
    expect(secondJoined.players).toHaveLength(2);
    expect(firstJoined.selfPlayerId).not.toBe(secondJoined.selfPlayerId);
    expect(secondJoined.hostPlayerId).toBe(firstJoined.hostPlayerId);
  });

  it('transfers the host and removes a socket on disconnect', async () => {
    const first = await createClient();
    const second = await createClient();
    const roomId = nextRoom();

    const firstState = waitForEvent<RoomStatePayload>(first, 'room:state');
    first.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    const joined = await firstState;

    const secondState = waitForEvent<RoomStatePayload>(second, 'room:state');
    second.emit('room:join', { roomId, playerName: 'Bobby' });
    await secondState;

    const hostChanged = waitForEvent<{ playerId: string; playerName: string }>(second, 'host:changed');
    const remainingState = waitForEvent<RoomStatePayload>(second, 'room:state');
    first.disconnect();

    await expect(hostChanged).resolves.toMatchObject({ playerName: 'Bobby', playerId: expect.not.stringMatching(joined.selfPlayerId) });
    await expect(remainingState).resolves.toMatchObject({ players: [{ name: 'Bobby' }], hostPlayerId: expect.any(String) });
  });

  it('handles an explicit leave and rejects a second leave', async () => {
    const first = await createClient();
    const second = await createClient();
    const roomId = nextRoom();
    const firstState = waitForEvent<RoomStatePayload>(first, 'room:state');
    first.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    await firstState;

    const secondState = waitForEvent<RoomStatePayload>(second, 'room:state');
    second.emit('room:join', { roomId, playerName: 'Bobby' });
    await secondState;

    const remainingState = waitForEvent<RoomStatePayload>(second, 'room:state');
    first.emit('room:leave', { roomId });
    await expect(remainingState).resolves.toMatchObject({ players: [{ name: 'Bobby' }] });

    const error = waitForEvent<RoomErrorPayload>(first, 'room:error');
    first.emit('room:leave', { roomId });
    await expect(error).resolves.toMatchObject({ code: 'UNAUTHORIZED', event: 'room:leave', roomId });
  });

  it('rejects invalid names and duplicate names before joining', async () => {
    const first = await createClient();
    const roomId = nextRoom();
    const firstState = waitForEvent<RoomStatePayload>(first, 'room:state');
    first.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    await firstState;

    const second = await createClient();
    const invalid = waitForEvent<RoomErrorPayload>(second, 'room:error');
    second.emit('room:join', { roomId, playerName: 'Bob' });
    await expect(invalid).resolves.toMatchObject({ code: 'INVALID_PLAYER' });

    const duplicate = waitForEvent<RoomErrorPayload>(second, 'room:error');
    second.emit('room:join', { roomId, playerName: 'Alice' });
    await expect(duplicate).resolves.toMatchObject({ code: 'INVALID_PLAYER' });
  });
});

import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { ServerToClientEvents } from '../../../shared/protocol.ts';
import type { GamePausedPayload, GameSpectrumPayload, GameStatePayload, RoomStatePayload } from '../../../shared/types.ts';
import { connectClient, startSocketServer, type TestClient } from '../helpers/socketServer.ts';

type ServerEvent = keyof ServerToClientEvents;

const next = <T>(client: TestClient, event: ServerEvent, match: (payload: T) => boolean = () => true) =>
  new Promise<T>((resolve) => {
    const listener = (payload: T) => {
      if (!match(payload)) return;
      client.off(event, listener as never);
      resolve(payload);
    };
    client.on(event, listener as never);
  });

const collect = <T>(client: TestClient, event: ServerEvent) => {
  const received: T[] = [];
  client.on(event, ((payload: T) => received.push(payload)) as never);
  return received;
};

const settle = (ms = 50) => new Promise((resolve) => setTimeout(resolve, ms));

// A reload, a frozen background tab or a network drop: the seat waits RECONNECT_GRACE_MS for the same name.
describe('reconnection grace', () => {
  const servers: Awaited<ReturnType<typeof startSocketServer>>[] = [];
  const clients: TestClient[] = [];
  let roomNumber = 0;

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
  });

  afterAll(async () => {
    await Promise.all(servers.map((server) => server.close()));
  });

  const duel = async (graceMs: number) => {
    const server = await startSocketServer(60_000, graceMs);
    servers.push(server);
    const connect = async () => {
      const client = await connectClient(server.url);
      clients.push(client);
      return client;
    };
    const roomId = `back-${++roomNumber}`;
    const alice = await connect();
    const bobby = await connect();
    const aliceId = (await new Promise<RoomStatePayload>((resolve) => {
      alice.once('room:state', resolve);
      alice.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    })).selfPlayerId;
    const seated = next<RoomStatePayload>(alice, 'room:state', ({ players }) => players.length === 2);
    bobby.emit('room:join', { roomId, playerName: 'Bobby' });
    const bobbyId = (await seated).players[1].playerId;
    return { roomId, alice, bobby, aliceId, bobbyId, connect };
  };

  // Bobby (guest) presses Ready, then Alice (host) starts.
  const startRound = async ({ roomId, alice, bobby }: Awaited<ReturnType<typeof duel>>) => {
    const ready = next<RoomStatePayload>(alice, 'room:state', ({ players }) => players.some(({ isReady }) => isReady));
    bobby.emit('room:start', { roomId });
    await ready;
    const started = Promise.all([next(alice, 'game:started'), next(bobby, 'game:started')]);
    alice.emit('room:start', { roomId });
    await started;
  };

  it('lets a reloaded host take its seat back, with the guest still ready, and start', async () => {
    const room = await duel(2000);
    const bobbyStates = collect<RoomStatePayload>(room.bobby, 'room:state');
    const bobbyReady = next<RoomStatePayload>(room.alice, 'room:state', ({ players }) => players.some(({ isReady }) => isReady));
    room.bobby.emit('room:start', { roomId: room.roomId });
    await bobbyReady;

    const held = next<RoomStatePayload>(room.bobby, 'room:state', ({ players }) => players.some(({ isConnected }) => !isConnected));
    room.alice.disconnect();
    await expect(held).resolves.toMatchObject({ players: [{ name: 'Alice', isConnected: false }, { name: 'Bobby', isReady: true }] });

    const aliceAgain = await room.connect();
    const back = next<RoomStatePayload>(aliceAgain, 'room:state');
    aliceAgain.emit('room:join', { roomId: room.roomId, playerName: 'Alice' });
    await expect(back).resolves.toMatchObject({ selfPlayerId: room.aliceId, hostPlayerId: room.aliceId, players: [{ isConnected: true }, { isReady: true }] });

    const started = next(room.bobby, 'game:started');
    aliceAgain.emit('room:start', { roomId: room.roomId });
    await started;
    expect(bobbyStates.every(({ players }) => players.length === 2)).toBe(true);
  });

  it('pauses a running round for the held seat and resumes it with the boards for the returning player', async () => {
    const room = await duel(2000);
    await startRound(room);

    const paused = next<GamePausedPayload>(room.alice, 'game:paused');
    room.bobby.disconnect();
    await expect(paused).resolves.toMatchObject({ playerId: room.bobbyId, graceMs: 2000 });

    const ignored = collect<GameStatePayload>(room.alice, 'game:state');
    room.alice.emit('game:input', { roomId: room.roomId, action: 'move_left', sequence: 1 });
    await settle();
    expect(ignored).toEqual([]);

    const bobbyAgain = await room.connect();
    const resumed = Promise.all([next(room.alice, 'game:resumed'), next(bobbyAgain, 'game:resumed')]);
    const boards = collect<GameStatePayload>(bobbyAgain, 'game:state');
    const spectrums = collect<GameSpectrumPayload>(bobbyAgain, 'game:spectrum');
    bobbyAgain.emit('room:join', { roomId: room.roomId, playerName: 'Bobby' });
    await resumed;
    await settle();

    expect(new Set(boards.map(({ playerId }) => playerId))).toEqual(new Set([room.aliceId, room.bobbyId]));
    expect(new Set(spectrums.map(({ playerId }) => playerId))).toEqual(new Set([room.aliceId, room.bobbyId]));
    const moved = next<GameStatePayload>(bobbyAgain, 'game:state', ({ state }) => state.lastSequence === 2);
    room.alice.emit('game:input', { roomId: room.roomId, action: 'move_left', sequence: 2 });
    await expect(moved).resolves.toMatchObject({ playerId: room.aliceId });
  });
});

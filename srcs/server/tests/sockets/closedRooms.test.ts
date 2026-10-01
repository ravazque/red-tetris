import { afterAll, afterEach, describe, expect, it } from 'vitest';
import type { ServerToClientEvents } from '../../../shared/protocol.ts';
import type { RoomErrorPayload, RoomStatePayload } from '../../../shared/types.ts';
import { connectClient, startSocketServer, type TestClient } from '../helpers/socketServer.ts';

type ServerEvent = keyof ServerToClientEvents;
type Finished = { readonly winnerPlayerId: string | null; readonly reason?: string };

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

const GRACE_MS = 80;

// A duel that loses a player (Leave, or no reconnection within the grace) closes for good, in every phase:
// a running round goes to the one left, then nobody joins or comes back, and there is no Start or Restart.
describe('closed rooms', () => {
  const servers: Awaited<ReturnType<typeof startSocketServer>>[] = [];
  const clients: TestClient[] = [];
  let roomNumber = 0;

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
  });

  afterAll(async () => {
    await Promise.all(servers.map((server) => server.close()));
  });

  const duel = async () => {
    const server = await startSocketServer(60_000, GRACE_MS);
    servers.push(server);
    const connect = async () => {
      const client = await connectClient(server.url);
      clients.push(client);
      return client;
    };
    const roomId = `shut-${++roomNumber}`;
    const alice = await connect();
    const bobby = await connect();
    const aliceId = (await new Promise<RoomStatePayload>((resolve) => {
      alice.once('room:state', resolve);
      alice.emit('room:join', { roomId, playerName: 'Alice', mode: 'versus' });
    })).selfPlayerId;
    const seated = next<RoomStatePayload>(alice, 'room:state', ({ players }) => players.length === 2);
    bobby.emit('room:join', { roomId, playerName: 'Bobby' });
    await seated;
    return { roomId, alice, bobby, aliceId, connect };
  };

  type Duel = Awaited<ReturnType<typeof duel>>;

  // Bobby (guest) presses Ready, then Alice (host) starts or restarts.
  const bothPress = async ({ roomId, alice, bobby }: Duel, command: 'room:start' | 'room:restart') => {
    const ready = next<RoomStatePayload>(alice, 'room:state', ({ players }) => players.some(({ isReady }) => isReady));
    bobby.emit(command, { roomId });
    await ready;
    const started = Promise.all([next(alice, 'game:started'), next(bobby, 'game:started')]);
    alice.emit(command, { roomId });
    await started;
  };

  const toPhase = async (room: Duel, phase: 'waiting' | 'running' | 'finished') => {
    if (phase === 'waiting') return;
    await bothPress(room, 'room:start');
    if (phase === 'running') return;
    const over = next<RoomStatePayload>(room.alice, 'room:state', ({ phase: current }) => current === 'finished');
    for (const player of [room.alice, room.bobby]) {
      for (let sequence = 1; sequence <= 60; sequence += 1) player.emit('game:input', { roomId: room.roomId, action: 'hard_drop', sequence });
    }
    await over;
  };

  const leaves = {
    left: (room: Duel) => room.bobby.emit('room:leave', { roomId: room.roomId }),
    timeout: (room: Duel) => room.bobby.disconnect(),
  };

  const refusal = async (client: TestClient, send: () => void) => {
    const error = next<RoomErrorPayload>(client, 'room:error');
    send();
    return (await error).code;
  };

  describe.each(['waiting', 'running', 'finished'] as const)('when Bobby goes while the room is %s', (phase) => {
    it.each(['left', 'timeout'] as const)('closes the room for Alice (reason %s)', async (reason) => {
      const room = await duel();
      await toPhase(room, phase);
      const finished = collect<Finished>(room.alice, 'game:finished');

      const closed = next<RoomStatePayload>(room.alice, 'room:state', ({ closed: closure }) => closure !== null);
      leaves[reason](room);

      await expect(closed).resolves.toMatchObject({
        phase: 'finished',
        closed: { playerName: 'Bobby', reason },
        players: [{ playerId: room.aliceId, isReady: false }],
      });
      if (phase === 'running') expect(finished).toEqual([expect.objectContaining({ winnerPlayerId: room.aliceId, reason })]);
      else expect(finished).toEqual([]);
    });
  });

  it('keeps everyone out of a closed room: Bobby coming back, a new player, Start and Restart', async () => {
    const room = await duel();
    await toPhase(room, 'running');
    const closed = next<RoomStatePayload>(room.alice, 'room:state', ({ closed: closure }) => closure !== null);
    leaves.timeout(room);
    await closed;

    const bobbyAgain = await room.connect();
    const carol = await room.connect();
    expect(await refusal(bobbyAgain, () => bobbyAgain.emit('room:join', { roomId: room.roomId, playerName: 'Bobby' }))).toBe('ROOM_CLOSED');
    expect(await refusal(carol, () => carol.emit('room:join', { roomId: room.roomId, playerName: 'Carol', mode: 'versus' }))).toBe('ROOM_CLOSED');
    expect(await refusal(room.alice, () => room.alice.emit('room:restart', { roomId: room.roomId }))).toBe('ROOM_CLOSED');
    expect(await refusal(room.alice, () => room.alice.emit('room:start', { roomId: room.roomId }))).toBe('ROOM_CLOSED');
  });

  it('frees the room code once the last player leaves the closed room', async () => {
    const room = await duel();
    const closed = next<RoomStatePayload>(room.alice, 'room:state', ({ closed: closure }) => closure !== null);
    leaves.left(room);
    await closed;
    room.alice.emit('room:leave', { roomId: room.roomId });

    const dave = await room.connect();
    const fresh = await new Promise<RoomStatePayload>((resolve) => {
      dave.once('room:state', resolve);
      setTimeout(() => dave.emit('room:join', { roomId: room.roomId, playerName: 'Dave', mode: 'versus' }), 30);
    });

    expect(fresh).toMatchObject({ phase: 'waiting', closed: null, players: [{ name: 'Dave' }] });
  });

  it('still allows the rematch when Bobby is back within the grace on the end-of-round screen', async () => {
    const room = await duel();
    await toPhase(room, 'finished');
    const held = next<RoomStatePayload>(room.alice, 'room:state', ({ players }) => players.some(({ isConnected }) => !isConnected));
    room.bobby.disconnect();
    await held;

    const bobbyAgain = await room.connect();
    const back = next<RoomStatePayload>(room.alice, 'room:state', ({ players }) => players.every(({ isConnected }) => isConnected));
    bobbyAgain.emit('room:join', { roomId: room.roomId, playerName: 'Bobby' });
    await expect(back).resolves.toMatchObject({ closed: null, phase: 'finished' });

    await bothPress({ ...room, bobby: bobbyAgain }, 'room:restart');
  });
});

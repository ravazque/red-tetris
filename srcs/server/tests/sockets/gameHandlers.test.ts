import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { ServerToClientEvents } from '../../../shared/protocol.ts';
import type {
  GameSpectrumPayload,
  GameStartedPayload,
  GameStatePayload,
  PongStatePayload,
  RoomErrorPayload,
  RoomStatePayload,
} from '../../../shared/types.ts';
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

const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

// Whole rounds through real sockets: two players, both press Start, play, end, rematch or leave.
describe('game handlers', () => {
  const servers: Awaited<ReturnType<typeof startSocketServer>>[] = [];
  const clients: TestClient[] = [];
  let slow: Awaited<ReturnType<typeof startSocketServer>>;
  let roomNumber = 0;

  beforeAll(async () => {
    slow = await startSocketServer(60_000);
    servers.push(slow);
  });

  afterEach(() => {
    for (const client of clients.splice(0)) client.disconnect();
  });

  afterAll(async () => {
    await Promise.all(servers.map((server) => server.close()));
  });

  const createClient = async (url = slow.url) => {
    const client = await connectClient(url);
    clients.push(client);
    return client;
  };

  const join = (client: TestClient, roomId: string, playerName: string, mode?: 'solo' | 'versus' | 'pontrix', rule?: 'survival' | 'score') => {
    const state = next<RoomStatePayload>(client, 'room:state');
    client.emit('room:join', mode ? { roomId, playerName, mode, ...(rule && { rule }) } : { roomId, playerName });
    return state;
  };

  const versus = async (url = slow.url, rule?: 'survival' | 'score', mode: 'versus' | 'pontrix' = 'versus') => {
    const roomId = `game-${++roomNumber}`;
    const alice = await createClient(url);
    const bobby = await createClient(url);
    const aliceId = (await join(alice, roomId, 'Alice', mode, rule)).selfPlayerId;
    const bothSeated = next<RoomStatePayload>(alice, 'room:state', ({ players }) => players.length === 2);
    const bobbyId = (await join(bobby, roomId, 'Bobby')).selfPlayerId;
    await bothSeated;
    return { roomId, alice, bobby, aliceId, bobbyId };
  };

  // Bobby (guest) presses Ready, then Alice (host) starts or restarts; resolves with the first board of Alice's that Bobby sees.
  const bothPress = async (room: Awaited<ReturnType<typeof versus>>, command: 'room:start' | 'room:restart' = 'room:start') => {
    const { roomId, alice, bobby, aliceId, bobbyId } = room;
    const bobbyReady = next<RoomStatePayload>(alice, 'room:state', ({ players }) => players.some((player) => player.playerId === bobbyId && player.isReady));
    bobby.emit(command, { roomId });
    await bobbyReady;
    const started = Promise.all([next<GameStartedPayload>(alice, 'game:started'), next<GameStartedPayload>(bobby, 'game:started')]);
    const firstBoard = next<GameStatePayload>(bobby, 'game:state', ({ playerId }) => playerId === aliceId);
    alice.emit(command, { roomId });
    await started;
    return (await firstBoard).state;
  };

  const dropAll = (client: TestClient, roomId: string, from = 1) => {
    for (let sequence = from; sequence < from + 60; sequence += 1) client.emit('game:input', { roomId, action: 'hard_drop', sequence });
  };

  // Both players hard-drop to the top: the round ends once neither is playing.
  const topOut = async ({ roomId, alice, bobby }: Awaited<ReturnType<typeof versus>>) => {
    const finished = next<RoomStatePayload>(alice, 'room:state', ({ phase }) => phase === 'finished');
    dropAll(alice, roomId);
    dropAll(bobby, roomId);
    return finished;
  };

  it('starts a duel only when the host presses Start after the guest is ready', async () => {
    const room = await versus();
    const started = collect<GameStartedPayload>(room.alice, 'game:started');
    const readyState = next<RoomStatePayload>(room.alice, 'room:state', ({ players }) => players.some(({ isReady }) => isReady));

    room.bobby.emit('room:start', { roomId: room.roomId });

    await expect(readyState).resolves.toMatchObject({
      phase: 'waiting',
      players: [
        { playerId: room.aliceId, isReady: false },
        { playerId: room.bobbyId, isReady: true },
      ],
    });
    await settle();
    expect(started).toEqual([]);

    const begin = next<GameStartedPayload>(room.bobby, 'game:started');
    room.alice.emit('room:start', { roomId: room.roomId });
    await expect(begin).resolves.toMatchObject({ phase: 'running', playerIds: [room.aliceId, room.bobbyId] });
  });

  it('sets the duel rule when the room is created: versus as asked, Pon-Trix always score, kept for the guest', async () => {
    const alice = await createClient();
    const bobby = await createClient();
    const carol = await createClient();
    const versusRoom = `rule-${++roomNumber}`;
    const pontrixRoom = `rule-${++roomNumber}`;

    expect(await join(alice, versusRoom, 'Alice', 'versus', 'score')).toMatchObject({ rule: 'score' });
    expect(await join(bobby, versusRoom, 'Bobby', 'versus', 'survival')).toMatchObject({ mode: 'versus', rule: 'score' });
    const pontrix = next<RoomStatePayload>(carol, 'room:state');
    carol.emit('room:join', { roomId: pontrixRoom, playerName: 'Carol', mode: 'pontrix', rule: 'survival' });
    await expect(pontrix).resolves.toMatchObject({ mode: 'pontrix', rule: 'score' });

    const dave = await createClient();
    const error = next<RoomErrorPayload>(dave, 'room:error');
    dave.emit('room:join', { roomId: `rule-${++roomNumber}`, playerName: 'Dave', mode: 'versus', rule: 'sudden' } as never);
    await expect(error).resolves.toMatchObject({ code: 'INVALID_PAYLOAD' });
  });

  it('refuses the host\'s Start until the guest is ready', async () => {
    const room = await versus();

    const error = next<RoomErrorPayload>(room.alice, 'room:error');
    room.alice.emit('room:start', { roomId: room.roomId });

    await expect(error).resolves.toMatchObject({ code: 'NOT_READY', event: 'room:start' });
  });

  it('refuses Start in a duel with a free seat', async () => {
    const roomId = `game-${++roomNumber}`;
    const alice = await createClient();
    await join(alice, roomId, 'Alice', 'versus');

    const error = next<RoomErrorPayload>(alice, 'room:error');
    alice.emit('room:start', { roomId });

    await expect(error).resolves.toMatchObject({ code: 'NOT_ENOUGH_PLAYERS', event: 'room:start' });
  });

  it('sends both boards and both spectrums to the whole room', async () => {
    const room = await versus();
    const aliceStates = collect<GameStatePayload>(room.alice, 'game:state');
    const aliceSpectrums = collect<GameSpectrumPayload>(room.alice, 'game:spectrum');
    const rivalSpectrum = next<GameSpectrumPayload>(room.bobby, 'game:spectrum', ({ playerId }) => playerId === room.aliceId);

    const aliceBoard = await bothPress(room);
    await settle();

    expect(aliceBoard).toMatchObject({ isAlive: true, lastSequence: 0, score: 0 });
    await expect(rivalSpectrum).resolves.toMatchObject({ playerId: room.aliceId, spectrum: Array(10).fill(0) });
    expect(new Set(aliceStates.map(({ playerId }) => playerId))).toEqual(new Set([room.aliceId, room.bobbyId]));
    expect(new Set(aliceSpectrums.map(({ playerId }) => playerId))).toEqual(new Set([room.aliceId, room.bobbyId]));
  });

  it('runs Pong for Pon-Trix and moves only the requesting player paddle', async () => {
    const room = await versus(slow.url, undefined, 'pontrix');
    const pong = next<PongStatePayload>(room.bobby, 'pong:state', ({ state }) => state.paddles[room.aliceId] > 10);
    await bothPress(room);

    room.alice.emit('pong:input', { roomId: room.roomId, direction: 1 });
    const state = await pong;

    expect(state.state.paddles[room.aliceId]).toBeGreaterThan(10);
    expect(state.state.paddles[room.bobbyId]).toBe(10);
  });

  it('restarts Pon-Trix with a fresh Pong state after the Tetris round ends', async () => {
    const room = await versus(slow.url, undefined, 'pontrix');
    await bothPress(room);
    await topOut(room);

    const freshPong = next<PongStatePayload>(room.bobby, 'pong:state', ({ state }) => (
      state.ball.x === 13 && state.ball.y === 10 && state.goals[room.aliceId] === 0 && state.goals[room.bobbyId] === 0
    ));
    await bothPress(room, 'room:restart');

    await expect(freshPong).resolves.toMatchObject({ roomId: room.roomId, state: { ball: { x: 13, y: 10 } } });
  });

  it('does not mix game or Pong events between concurrent rooms', async () => {
    const [first, second] = await Promise.all([
      versus(slow.url, undefined, 'pontrix'),
      versus(slow.url, undefined, 'pontrix'),
    ]);
    const firstStates = collect<GameStatePayload>(first.alice, 'game:state');
    const secondStates = collect<GameStatePayload>(second.alice, 'game:state');
    const firstPong = collect<PongStatePayload>(first.alice, 'pong:state');
    const secondPong = collect<PongStatePayload>(second.alice, 'pong:state');

    await Promise.all([bothPress(first), bothPress(second)]);
    const moved = next<PongStatePayload>(first.alice, 'pong:state', ({ state }) => state.paddles[first.aliceId] > 10);
    first.alice.emit('pong:input', { roomId: first.roomId, direction: 1 });
    await moved;

    expect(firstStates.every(({ roomId }) => roomId === first.roomId)).toBe(true);
    expect(secondStates.every(({ roomId }) => roomId === second.roomId)).toBe(true);
    expect(firstPong.every(({ roomId }) => roomId === first.roomId)).toBe(true);
    expect(secondPong.every(({ roomId }) => roomId === second.roomId)).toBe(true);
    expect(secondPong.at(-1)?.state.paddles[second.aliceId]).toBe(10);
  });

  it('applies a player input and shows it to the rival right away', async () => {
    const room = await versus();
    const start = await bothPress(room);

    const moved = next<GameStatePayload>(room.bobby, 'game:state', ({ playerId, state }) => playerId === room.aliceId && state.lastSequence === 1);
    room.alice.emit('game:input', { roomId: room.roomId, action: 'move_left', sequence: 1 });

    expect((await moved).state.active?.x).toBe((start.active?.x ?? 0) - 1);
  });

  it('rejects inputs outside a running round or from outside the room', async () => {
    const room = await versus();
    const stranger = await createClient();

    let error = next<RoomErrorPayload>(room.alice, 'room:error');
    room.alice.emit('game:input', { roomId: room.roomId, action: 'rotate', sequence: 1 });
    await expect(error).resolves.toMatchObject({ code: 'INVALID_PHASE', event: 'game:input', roomId: room.roomId });

    error = next<RoomErrorPayload>(stranger, 'room:error');
    stranger.emit('game:input', { roomId: room.roomId, action: 'rotate', sequence: 1 });
    await expect(error).resolves.toMatchObject({ code: 'UNAUTHORIZED' });

    error = next<RoomErrorPayload>(room.alice, 'room:error');
    room.alice.emit('game:input', { roomId: room.roomId } as never);
    await expect(error).resolves.toMatchObject({ code: 'INVALID_PAYLOAD', roomId: null });

    await bothPress(room);
    error = next<RoomErrorPayload>(room.alice, 'room:error');
    room.alice.emit('game:input', { roomId: room.roomId, action: 'spin', sequence: 1 } as never);
    await expect(error).resolves.toMatchObject({ code: 'INVALID_ACTION' });
  });

  it('makes pieces fall on every gravity tick', async () => {
    const fast = await startSocketServer(20);
    servers.push(fast);
    const room = await versus(fast.url);
    const y = (await bothPress(room)).active?.y ?? 0;

    const fallen = await next<GameStatePayload>(room.alice, 'game:state', ({ playerId, state }) => playerId === room.aliceId && (state.active?.y ?? 0) >= y + 2);

    expect(fallen.state.lastSequence).toBe(0);
  });

  it('survival (default): a player who tops out loses at once, and both see it', async () => {
    const room = await versus();
    await bothPress(room);
    const toBobby = next<{ winnerPlayerId: string | null; reason?: string }>(room.bobby, 'game:finished');
    const over = next<RoomStatePayload>(room.alice, 'room:state', ({ phase }) => phase === 'finished');

    dropAll(room.alice, room.roomId);

    await expect(over).resolves.toMatchObject({ rule: 'survival', players: [{ isAlive: false }, { isAlive: true }] });
    await expect(toBobby).resolves.toMatchObject({ winnerPlayerId: room.bobbyId, reason: 'topout' });
  });

  it('score (chosen by the creator, kept for the guest): a topped-out player waits until the rival is out too', async () => {
    const room = await versus(slow.url, 'score');
    await bothPress(room);
    const finished = collect<{ winnerPlayerId: string | null; reason?: string }>(room.bobby, 'game:finished');
    const aliceOut = next<GameStatePayload>(room.bobby, 'game:state', ({ playerId, state }) => playerId === room.aliceId && !state.isAlive);
    dropAll(room.alice, room.roomId);
    await aliceOut;
    await settle();
    expect(finished).toEqual([]);

    const result = next<{ winnerPlayerId: string | null; reason?: string }>(room.bobby, 'game:finished');
    const over = next<RoomStatePayload>(room.alice, 'room:state', ({ phase }) => phase === 'finished');
    dropAll(room.bobby, room.roomId);
    await expect(over).resolves.toMatchObject({ players: [{ isAlive: false }, { isAlive: false }] });
    await expect(result).resolves.toMatchObject({ reason: 'score' });
  });

  it('plays a rematch against the same rival once both press Restart', async () => {
    const room = await versus();
    await bothPress(room);
    await topOut(room);

    const fresh = await bothPress(room, 'room:restart');

    expect(fresh).toMatchObject({ isAlive: true, score: 0, lines: 0, lastSequence: 0 });
    const moved = next<GameStatePayload>(room.alice, 'game:state', ({ playerId, state }) => playerId === room.bobbyId && state.lastSequence === 1);
    room.bobby.emit('game:input', { roomId: room.roomId, action: 'rotate', sequence: 1 });
    await expect(moved).resolves.toBeTruthy();
  });

  it('refuses Restart before the round is over', async () => {
    const room = await versus();
    await bothPress(room);

    const error = next<RoomErrorPayload>(room.alice, 'room:error');
    room.alice.emit('room:restart', { roomId: room.roomId });

    await expect(error).resolves.toMatchObject({ code: 'INVALID_PHASE', event: 'room:restart' });
  });

  it('plays a solo round to the top and restarts it alone', async () => {
    const roomId = `game-${++roomNumber}`;
    const alice = await createClient();
    await join(alice, roomId, 'Alice', 'solo');
    const started = next(alice, 'game:started');
    alice.emit('room:start', { roomId });
    await started;

    const finished = next<{ winnerPlayerId: string | null; reason?: string }>(alice, 'game:finished');
    const ended = next<RoomStatePayload>(alice, 'room:state', ({ phase }) => phase === 'finished');
    dropAll(alice, roomId);
    const over = await ended;

    await expect(finished).resolves.toMatchObject({ winnerPlayerId: null, reason: 'topout' });
    expect(over).toMatchObject({ players: [{ isAlive: false }] });

    const restarted = next(alice, 'game:started');
    const fresh = next<GameStatePayload>(alice, 'game:state', ({ state }) => state.isAlive && state.score === 0);
    alice.emit('room:restart', { roomId });
    await restarted;
    await expect(fresh).resolves.toMatchObject({ state: { lastSequence: 0 } });
  });
});

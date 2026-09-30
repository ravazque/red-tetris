import type { Game, GameFactory } from '../domain/Game.ts';
import { RoomManager, RoomManagerError, type RoomSnapshot } from './RoomManager.ts';

export interface LifecycleResult {
  readonly room: RoomSnapshot;
  readonly game: Game;
}

// Coordinates room phases and one game session per room without implementing
// Tetris rules. The real Game factory can replace the placeholder later.
export class RoomLifecycle {
  private readonly games = new Map<string, Game>();
  private readonly rooms: RoomManager;
  private readonly createGame: GameFactory;

  public constructor(rooms: RoomManager, createGame: GameFactory) {
    this.rooms = rooms;
    this.createGame = createGame;
  }

  public start(roomId: string, socketId: string): LifecycleResult {
    return this.begin(roomId, socketId, 'waiting');
  }

  public restart(roomId: string, socketId: string): LifecycleResult {
    return this.begin(roomId, socketId, 'finished');
  }

  public remove(roomId: string): void {
    this.games.delete(roomId);
  }

  public getGame(roomId: string): Game | null {
    return this.games.get(roomId) ?? null;
  }

  private begin(roomId: string, socketId: string, expectedPhase: 'waiting' | 'finished'): LifecycleResult {
    const current = this.rooms.getRoom(roomId);
    if (!current) throw new RoomManagerError('INVALID_ROOM', 'Room does not exist');
    if (current.phase !== expectedPhase) {
      throw new RoomManagerError('INVALID_PHASE', `Room must be ${expectedPhase} to start a game`);
    }
    if (current.mode === 'pontrix' && current.members.length < 2) {
      throw new RoomManagerError('NOT_ENOUGH_PLAYERS', 'Pon-Trix needs two players to start');
    }

    this.rooms.assertHost(roomId, socketId);
    const game = this.createGame({
      roomId: current.roomId,
      playerIds: current.members.map(({ playerId }) => playerId),
    });
    const room = this.rooms.transitionPhase(roomId, socketId, 'running');
    this.games.set(roomId, game);
    return { room, game };
  }
}

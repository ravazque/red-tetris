import { MAX_PLAYERS_PER_ROOM } from '../../../shared/constants.ts';
import type { Game, GameFactory } from '../domain/Game.ts';
import { RoomManager, RoomManagerError, type RoomSnapshot } from './RoomManager.ts';

export interface LifecycleResult {
  readonly room: RoomSnapshot;
  // null while the other seat is not ready yet.
  readonly game: Game | null;
}

// The host starts or restarts a round, each with a new Game: in versus and Pon-Trix once the other player pressed Ready; a closed room starts none.
export class RoomLifecycle {
  private readonly games = new Map<string, Game>();
  private readonly ready = new Map<string, Set<string>>();
  private readonly rooms: RoomManager;
  private readonly createGame: GameFactory;

  public constructor(rooms: RoomManager, createGame: GameFactory) {
    this.rooms = rooms;
    this.createGame = createGame;
  }

  public start(roomId: string, socketId: string): LifecycleResult {
    return this.markReady(roomId, socketId, 'waiting');
  }

  public restart(roomId: string, socketId: string): LifecycleResult {
    return this.markReady(roomId, socketId, 'finished');
  }

  public isReady(roomId: string, playerId: string): boolean {
    return this.ready.get(roomId)?.has(playerId) ?? false;
  }

  public unready(roomId: string, playerId: string): void {
    this.ready.get(roomId)?.delete(playerId);
  }

  public clearReady(roomId: string): void {
    this.ready.delete(roomId);
  }

  public remove(roomId: string): void {
    this.games.delete(roomId);
    this.ready.delete(roomId);
  }

  public getGame(roomId: string): Game | null {
    return this.games.get(roomId) ?? null;
  }

  private markReady(roomId: string, socketId: string, expectedPhase: 'waiting' | 'finished'): LifecycleResult {
    const current = this.rooms.getRoom(roomId);
    if (!current) throw new RoomManagerError('INVALID_ROOM', 'Room does not exist');
    const member = current.members.find((candidate) => candidate.socketId === socketId);
    if (!member) throw new RoomManagerError('UNAUTHORIZED', 'Socket is not a member of this room');
    if (current.closed) throw new RoomManagerError('ROOM_CLOSED', 'This room is closed');
    if (current.phase !== expectedPhase) {
      throw new RoomManagerError('INVALID_PHASE', `Room must be ${expectedPhase} to start a game`);
    }
    const seats = current.mode === 'solo' ? 1 : MAX_PLAYERS_PER_ROOM;
    if (current.members.length < seats) {
      throw new RoomManagerError('NOT_ENOUGH_PLAYERS', 'Two players are needed to start');
    }

    if (member.playerId !== current.hostPlayerId) {
      const ready = this.ready.get(roomId) ?? new Set<string>();
      ready.add(member.playerId);
      this.ready.set(roomId, ready);
      return { room: current, game: null };
    }
    if (current.members.some(({ playerId }) => playerId !== current.hostPlayerId && !this.isReady(roomId, playerId))) {
      throw new RoomManagerError('NOT_READY', 'Your rival is not ready yet');
    }

    this.ready.delete(roomId);
    const game = this.createGame({ roomId, playerIds: current.members.map(({ playerId }) => playerId), rule: current.rule });
    const room = this.rooms.advance(roomId, 'running');
    this.games.set(roomId, game);
    return { room, game };
  }
}

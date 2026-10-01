import type { GameAction } from '../../../shared/constants.ts';
import type { PaddleDirection } from '../../../shared/game/pontrix.ts';
import type { GameFinishedPayload } from '../../../shared/types.ts';
import type { EndReason, GameEvent } from '../domain/Game.ts';
import { Pong, PONG_TICK_MS } from '../domain/Pong.ts';
import type { RoomLifecycle } from '../rooms/RoomLifecycle.ts';
import type { RoomManager } from '../rooms/RoomManager.ts';
import type { IoServer } from './registerHandlers.ts';
import { emitRoomState } from './roomState.ts';

export const GRAVITY_MS = 800;

// Drives running rounds: one gravity interval per room, and every Game event turned into its broadcast.
export class GameRunner {
  private readonly timers = new Map<string, ReturnType<typeof setInterval>>();
  private readonly io: IoServer;
  private readonly rooms: RoomManager;
  private readonly lifecycle: RoomLifecycle;
  private readonly tickMs: number;
  private readonly pong = new Map<string, Pong>();
  private readonly gravityElapsed = new Map<string, number>();
  private readonly pongElapsed = new Map<string, number>();

  public constructor(io: IoServer, rooms: RoomManager, lifecycle: RoomLifecycle, tickMs = GRAVITY_MS) {
    this.io = io;
    this.rooms = rooms;
    this.lifecycle = lifecycle;
    this.tickMs = tickMs;
  }

  public start(roomId: string): void {
    const game = this.lifecycle.getGame(roomId);
    if (!game) return;
    this.stop(roomId);
    const room = this.rooms.getRoom(roomId);
    if (room?.mode === 'pontrix' && game.playerIds.length === 2) this.pong.set(roomId, new Pong([game.playerIds[0], game.playerIds[1]]));
    this.publish(roomId, game.playerIds.flatMap((playerId): GameEvent[] => [
      { type: 'state', playerId, state: game.snapshot(playerId) },
      { type: 'spectrum', playerId, spectrum: game.spectrum(playerId) },
    ]));
    this.publishPong(roomId);
    this.gravityElapsed.set(roomId, 0);
    this.pongElapsed.set(roomId, 0);
    const frameMs = room?.mode === 'pontrix' ? Math.min(this.tickMs, PONG_TICK_MS) : this.tickMs;
    this.timers.set(roomId, setInterval(() => {
      const elapsed = (this.gravityElapsed.get(roomId) ?? 0) + frameMs;
      if (elapsed >= this.tickMs) {
        this.gravityElapsed.set(roomId, 0);
        this.publish(roomId, game.tick());
      } else {
        this.gravityElapsed.set(roomId, elapsed);
      }
      if (room?.mode === 'pontrix') {
        const pongElapsed = (this.pongElapsed.get(roomId) ?? 0) + frameMs;
        if (pongElapsed >= PONG_TICK_MS) {
          this.pongElapsed.set(roomId, 0);
          this.tickPong(roomId, game);
        } else {
          this.pongElapsed.set(roomId, pongElapsed);
        }
      }
    }, frameMs));
  }

  public input(roomId: string, playerId: string, action: GameAction, sequence: number): void {
    const game = this.lifecycle.getGame(roomId);
    if (game) this.publish(roomId, game.applyInput(playerId, action, sequence));
  }

  public paddleInput(roomId: string, playerId: string, direction: PaddleDirection): void {
    this.pong.get(roomId)?.input(playerId, direction);
  }

  public removePlayer(roomId: string, playerId: string, reason: 'left' | 'timeout' = 'left'): void {
    const game = this.lifecycle.getGame(roomId);
    if (game?.playerIds.includes(playerId)) this.publish(roomId, game.removePlayer(playerId, reason));
  }

  // A player's socket dropped: the round freezes for everyone while the seat is held.
  public pause(roomId: string, playerId: string, graceMs: number): void {
    const game = this.lifecycle.getGame(roomId);
    const room = this.rooms.getRoom(roomId);
    if (!game || room?.phase !== 'running') return;
    game.pause();
    this.io.to(roomId).emit('game:paused', { roomId, revision: room.revision, playerId, graceMs });
  }

  // Every seat is connected again: the round goes on.
  public resume(roomId: string): void {
    const game = this.lifecycle.getGame(roomId);
    const room = this.rooms.getRoom(roomId);
    if (!game?.isPaused || !room || room.members.some(({ connected }) => !connected)) return;
    game.resume();
    this.io.to(roomId).emit('game:resumed', { roomId, revision: room.revision });
  }

  // A player back on a new socket: every board and spectrum of the round.
  public catchUp(roomId: string, socketId: string): void {
    const game = this.lifecycle.getGame(roomId);
    const room = this.rooms.getRoom(roomId);
    if (!game || !room) return;
    const envelope = { roomId, revision: room.revision };
    for (const playerId of game.playerIds) {
      this.io.to(socketId).emit('game:state', { ...envelope, playerId, state: game.snapshot(playerId) });
      this.io.to(socketId).emit('game:spectrum', { ...envelope, playerId, spectrum: [...game.spectrum(playerId)] });
    }
    this.publishPong(roomId, socketId);
  }

  public stop(roomId: string): void {
    clearInterval(this.timers.get(roomId));
    this.timers.delete(roomId);
    this.pong.delete(roomId);
    this.gravityElapsed.delete(roomId);
    this.pongElapsed.delete(roomId);
  }

  private tickPong(roomId: string, game: NonNullable<ReturnType<RoomLifecycle['getGame']>>): void {
    const pong = this.pong.get(roomId);
    const room = this.rooms.getRoom(roomId);
    if (!pong || !room || room.phase !== 'running' || game.isPaused || game.isFinished) return;
    const ids = game.playerIds;
    const snapshots = [game.snapshot(ids[0]), game.snapshot(ids[1])] as const;
    const events = pong.tick(snapshots);
    for (const event of events) {
      if (event.type === 'goal') this.publish(roomId, game.addPenalty(event.targetPlayerId, 1, event.sourcePlayerId));
    }
    if (this.rooms.getRoom(roomId)?.phase === 'running') this.publishPong(roomId);
  }

  private publishPong(roomId: string, socketId?: string): void {
    const pong = this.pong.get(roomId);
    const room = this.rooms.getRoom(roomId);
    if (!pong || !room) return;
    const target = socketId ? this.io.to(socketId) : this.io.to(roomId);
    target.emit('pong:state', { roomId, revision: room.revision, state: pong.snapshot() });
  }

  private publish(roomId: string, events: readonly GameEvent[]): void {
    const room = this.rooms.getRoom(roomId);
    if (!room) {
      this.stop(roomId);
      return;
    }
    const envelope = { roomId, revision: room.revision };
    const toRoom = this.io.to(roomId);
    for (const event of events) {
      switch (event.type) {
        case 'state':
          toRoom.emit('game:state', { ...envelope, playerId: event.playerId, state: event.state });
          break;
        case 'spectrum':
          toRoom.emit('game:spectrum', { ...envelope, playerId: event.playerId, spectrum: [...event.spectrum] });
          break;
        case 'penalty':
          toRoom.emit('game:penalty', { ...envelope, sourcePlayerId: event.sourcePlayerId, targetPlayerId: event.targetPlayerId, lines: event.lines });
          break;
        case 'eliminated':
          toRoom.emit('game:player_eliminated', { ...envelope, playerId: event.playerId });
          break;
        case 'finished':
          this.finish(roomId, event.winnerPlayerId, event.reason);
          break;
      }
    }
  }

  private finish(roomId: string, winnerPlayerId: string | null, reason: EndReason): void {
    this.stop(roomId);
    const room = this.rooms.advance(roomId, 'finished');
    // reason is a local extension until #26 adds it to the shared payload.
    const payload: GameFinishedPayload & { readonly reason: EndReason } = { roomId, revision: room.revision, winnerPlayerId, reason };
    this.io.to(roomId).emit('game:finished', payload);
    emitRoomState(this.io, room, this.lifecycle);
  }
}

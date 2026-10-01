import { randomUUID } from 'node:crypto';
import { MAX_PLAYERS_PER_ROOM, type ErrorCode, type RoomMode, type RoomPhase, type RoomRule } from '../../../shared/constants.ts';
import type { RoomClosure } from '../../../shared/types.ts';

export interface RoomMember {
  readonly playerId: string;
  readonly name: string;
  readonly socketId: string;
  // false while the seat is held for a player whose socket dropped (socketId is then the old one).
  readonly connected: boolean;
}

export interface RoomSnapshot {
  readonly roomId: string;
  readonly mode: RoomMode;
  readonly rule: RoomRule;
  readonly phase: RoomPhase;
  readonly revision: number;
  readonly hostPlayerId: string;
  readonly members: readonly RoomMember[];
  readonly closed: RoomClosure | null;
}

export interface SeatResult {
  readonly room: RoomSnapshot;
  readonly member: RoomMember;
}

export interface JoinResult extends SeatResult {
  // The name took back its held seat (same playerId) instead of a new one.
  readonly reclaimed: boolean;
}

export interface LeaveResult {
  readonly room: RoomSnapshot | null;
  readonly member: RoomMember;
  readonly hostChanged: boolean;
  readonly roomDeleted: boolean;
}

export type PlayerIdFactory = () => string;

export class RoomManagerError extends Error {
  public readonly code: ErrorCode;

  public constructor(code: ErrorCode, message: string) {
    super(message);
    this.name = 'RoomManagerError';
    this.code = code;
  }
}

interface RoomRecord {
  roomId: string;
  mode: RoomMode;
  rule: RoomRule;
  phase: RoomPhase;
  revision: number;
  hostPlayerId: string;
  members: Map<string, RoomMember>;
  closed: RoomClosure | null;
}

const isNonEmpty = (value: string) => value.trim().length > 0;

const cloneMember = (member: RoomMember): RoomMember => ({ ...member });

export class RoomManager {
  private readonly rooms = new Map<string, RoomRecord>();
  private readonly socketRooms = new Map<string, string>();
  private readonly createPlayerId: PlayerIdFactory;

  public constructor(createPlayerId: PlayerIdFactory = randomUUID) {
    this.createPlayerId = createPlayerId;
  }

  // mode and rule only matter when the join creates the room.
  public join(roomId: string, name: string, socketId: string, mode: RoomMode = 'versus', rule: RoomRule = 'survival'): JoinResult {
    this.assertIdentifier(roomId, 'room');
    this.assertIdentifier(name, 'player');
    this.assertIdentifier(socketId, 'socket');

    if (this.socketRooms.has(socketId)) {
      throw new RoomManagerError('INVALID_PLAYER', 'Socket is already registered in a room');
    }

    let room = this.rooms.get(roomId);
    const held = room && [...room.members.values()].find((member) => member.name === name && !member.connected);
    if (room && held) {
      const member: RoomMember = { ...held, socketId, connected: true };
      room.members.set(member.playerId, member);
      room.revision += 1;
      this.socketRooms.set(socketId, roomId);
      return { room: this.snapshot(room), member: cloneMember(member), reclaimed: true };
    }

    if (room?.closed) {
      throw new RoomManagerError('ROOM_CLOSED', 'This room is closed');
    }

    if (room?.phase === 'running') {
      throw new RoomManagerError('ROOM_RUNNING', 'Room does not accept new players while running');
    }

    const capacity = room?.mode === 'solo' ? 1 : MAX_PLAYERS_PER_ROOM;
    if (room && room.members.size >= capacity) {
      throw new RoomManagerError('ROOM_FULL', 'Room is full');
    }

    if (room && [...room.members.values()].some((member) => member.name === name)) {
      throw new RoomManagerError('INVALID_PLAYER', 'Player name is already used in this room');
    }

    if (!room) {
      room = {
        roomId,
        mode,
        rule,
        phase: 'waiting',
        revision: 0,
        hostPlayerId: '',
        members: new Map(),
        closed: null,
      };
      this.rooms.set(roomId, room);
    }

    const playerId = this.createUniquePlayerId(room);
    const member: RoomMember = {
      playerId,
      name,
      socketId,
      connected: true,
    };

    room.members.set(playerId, member);
    if (room.members.size === 1) {
      room.hostPlayerId = playerId;
    }
    room.revision += 1;
    this.socketRooms.set(socketId, roomId);

    return { room: this.snapshot(room), member: cloneMember(member), reclaimed: false };
  }

  // The socket dropped without leaving: the seat stays, held for a reconnection (join with the same name) or removeHeld.
  public disconnect(socketId: string): SeatResult | null {
    const roomId = this.socketRooms.get(socketId);
    if (!roomId) {
      return null;
    }
    this.socketRooms.delete(socketId);

    const room = this.rooms.get(roomId);
    const member = room && [...room.members.values()].find((candidate) => candidate.socketId === socketId);
    if (!room || !member) {
      return null;
    }

    const held: RoomMember = { ...member, connected: false };
    room.members.set(held.playerId, held);
    room.revision += 1;
    return { room: this.snapshot(room), member: cloneMember(held) };
  }

  // End of a reconnection grace: frees the seat unless its player came back.
  public removeHeld(roomId: string, playerId: string): LeaveResult | null {
    const room = this.rooms.get(roomId);
    const member = room?.members.get(playerId);
    if (!room || !member || member.connected) {
      return null;
    }
    return this.removeMember(room, member);
  }

  public leave(socketId: string): LeaveResult | null {
    const roomId = this.socketRooms.get(socketId);
    if (!roomId) {
      return null;
    }

    const room = this.rooms.get(roomId);
    if (!room) {
      this.socketRooms.delete(socketId);
      return null;
    }

    const member = [...room.members.values()].find((candidate) => candidate.socketId === socketId);
    if (!member) {
      this.socketRooms.delete(socketId);
      return null;
    }

    return this.removeMember(room, member);
  }

  private removeMember(room: RoomRecord, member: RoomMember): LeaveResult {
    room.members.delete(member.playerId);
    if (member.connected) this.socketRooms.delete(member.socketId);

    if (room.members.size === 0) {
      this.rooms.delete(room.roomId);
      return { room: null, member: cloneMember(member), hostChanged: false, roomDeleted: true };
    }

    let hostChanged = false;
    if (member.playerId === room.hostPlayerId) {
      const nextHost = room.members.values().next().value as RoomMember;
      room.hostPlayerId = nextHost.playerId;
      hostChanged = true;
    }

    room.revision += 1;
    return { room: this.snapshot(room), member: cloneMember(member), hostChanged, roomDeleted: false };
  }

  public getRoom(roomId: string): RoomSnapshot | null {
    return this.rooms.has(roomId) ? this.snapshot(this.rooms.get(roomId) as RoomRecord) : null;
  }

  public getRoomForSocket(socketId: string): RoomSnapshot | null {
    const roomId = this.socketRooms.get(socketId);
    return roomId ? this.getRoom(roomId) : null;
  }

  public transitionPhase(roomId: string, socketId: string, phase: RoomPhase): RoomSnapshot {
    this.assertHost(roomId, socketId);
    return this.advance(roomId, phase);
  }

  // Server-driven phase change (rounds start when every seat is ready, end when the Game does); no host check.
  public advance(roomId: string, phase: RoomPhase): RoomSnapshot {
    const room = this.getRoomRecord(roomId);

    if (room.phase === phase) {
      return this.snapshot(room);
    }

    if (!this.isValidTransition(room.phase, phase)) {
      throw new RoomManagerError('INVALID_PHASE', `Cannot transition room from ${room.phase} to ${phase}`);
    }

    room.phase = phase;
    room.revision += 1;
    return this.snapshot(room);
  }

  // A duel that lost a player is over for good: finished, no joins (a held seat can still come back), no new round.
  public close(roomId: string, closure: RoomClosure): RoomSnapshot {
    const room = this.getRoomRecord(roomId);
    room.closed = closure;
    room.phase = 'finished';
    room.revision += 1;
    return this.snapshot(room);
  }

  public assertHost(roomId: string, socketId: string): void {
    const room = this.getRoomRecord(roomId);
    const member = this.getMember(room, socketId);
    if (member.playerId !== room.hostPlayerId) {
      throw new RoomManagerError('UNAUTHORIZED', 'Only the host can change the room phase');
    }
  }

  private getRoomRecord(roomId: string): RoomRecord {
    const room = this.rooms.get(roomId);
    if (!room) {
      throw new RoomManagerError('INVALID_ROOM', 'Room does not exist');
    }
    return room;
  }

  private getMember(room: RoomRecord, socketId: string): RoomMember {
    const roomId = this.socketRooms.get(socketId);
    if (roomId !== room.roomId) {
      throw new RoomManagerError('INVALID_PLAYER', 'Socket is not a member of this room');
    }

    const member = [...room.members.values()].find((candidate) => candidate.socketId === socketId);
    if (!member) {
      throw new RoomManagerError('INVALID_PLAYER', 'Player does not exist in this room');
    }
    return member;
  }

  private createUniquePlayerId(room: RoomRecord): string {
    let playerId = this.createPlayerId();
    while ([...room.members.keys()].includes(playerId)) {
      playerId = this.createPlayerId();
    }
    return playerId;
  }

  private snapshot(room: RoomRecord): RoomSnapshot {
    return {
      roomId: room.roomId,
      mode: room.mode,
      rule: room.rule,
      phase: room.phase,
      revision: room.revision,
      hostPlayerId: room.hostPlayerId,
      members: [...room.members.values()].map(cloneMember),
      closed: room.closed,
    };
  }

  private assertIdentifier(value: string, kind: string): void {
    if (!isNonEmpty(value)) {
      throw new RoomManagerError('INVALID_PAYLOAD', `${kind} must not be empty`);
    }
  }

  private isValidTransition(current: RoomPhase, next: RoomPhase): boolean {
    return (current === 'waiting' && next === 'running')
      || (current === 'running' && next === 'finished')
      || (current === 'finished' && next === 'waiting')
      || (current === 'finished' && next === 'running');
  }
}

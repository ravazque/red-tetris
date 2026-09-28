import { randomUUID } from 'node:crypto';
import { MAX_PLAYERS_PER_ROOM, type ErrorCode, type RoomPhase } from '../../../shared/constants.ts';

export interface RoomMember {
  readonly playerId: string;
  readonly name: string;
  readonly socketId: string;
  readonly isHost: boolean;
  readonly isAlive: boolean;
}

export interface RoomSnapshot {
  readonly roomId: string;
  readonly phase: RoomPhase;
  readonly revision: number;
  readonly hostPlayerId: string;
  readonly members: readonly RoomMember[];
}

export interface JoinResult {
  readonly room: RoomSnapshot;
  readonly member: RoomMember;
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
  phase: RoomPhase;
  revision: number;
  hostPlayerId: string;
  members: Map<string, RoomMember>;
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

  public join(roomId: string, name: string, socketId: string): JoinResult {
    this.assertIdentifier(roomId, 'room');
    this.assertIdentifier(name, 'player');
    this.assertIdentifier(socketId, 'socket');

    if (this.socketRooms.has(socketId)) {
      throw new RoomManagerError('INVALID_PLAYER', 'Socket is already registered in a room');
    }

    let room = this.rooms.get(roomId);
    if (room?.phase === 'running') {
      throw new RoomManagerError('ROOM_RUNNING', 'Room does not accept new players while running');
    }

    if (room && room.members.size >= MAX_PLAYERS_PER_ROOM) {
      throw new RoomManagerError('ROOM_FULL', 'Room is full');
    }

    if (!room) {
      room = {
        roomId,
        phase: 'waiting',
        revision: 0,
        hostPlayerId: '',
        members: new Map(),
      };
      this.rooms.set(roomId, room);
    }

    const playerId = this.createUniquePlayerId(room);
    const isHost = room.members.size === 0;
    const member: RoomMember = {
      playerId,
      name,
      socketId,
      isHost,
      isAlive: true,
    };

    room.members.set(playerId, member);
    if (isHost) {
      room.hostPlayerId = playerId;
    }
    room.revision += 1;
    this.socketRooms.set(socketId, roomId);

    return { room: this.snapshot(room), member: cloneMember(member) };
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

    room.members.delete(member.playerId);
    this.socketRooms.delete(socketId);

    if (room.members.size === 0) {
      this.rooms.delete(roomId);
      return { room: null, member: cloneMember(member), hostChanged: false, roomDeleted: true };
    }

    let hostChanged = false;
    if (member.playerId === room.hostPlayerId) {
      const nextHost = room.members.values().next().value as RoomMember;
      room.hostPlayerId = nextHost.playerId;
      room.members.set(nextHost.playerId, { ...nextHost, isHost: true });
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
    const room = this.getRoomRecord(roomId);
    const member = this.getMember(room, socketId);

    if (member.playerId !== room.hostPlayerId) {
      throw new RoomManagerError('UNAUTHORIZED', 'Only the host can change the room phase');
    }

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
      phase: room.phase,
      revision: room.revision,
      hostPlayerId: room.hostPlayerId,
      members: [...room.members.values()].map(cloneMember),
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
      || (current === 'finished' && next === 'waiting');
  }
}

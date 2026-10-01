import { describe, expect, it } from 'vitest';
import {
  BOARD_HEIGHT,
  BOARD_WIDTH,
  ERROR_CODES,
  GAME_ACTIONS,
  ROOM_MODES,
  ROOM_PHASES,
  SOCKET_EVENTS,
} from '../../../shared/constants.ts';

describe('shared socket protocol constants', () => {
  it('exposes the room lifecycle events', () => {
    expect([
      SOCKET_EVENTS.roomJoin,
      SOCKET_EVENTS.roomLeave,
      SOCKET_EVENTS.roomStart,
      SOCKET_EVENTS.roomRestart,
    ]).toEqual(['room:join', 'room:leave', 'room:start', 'room:restart']);
  });

  it('exposes the game events', () => {
    expect([
      SOCKET_EVENTS.gameInput,
      SOCKET_EVENTS.pongInput,
      SOCKET_EVENTS.gameStarted,
      SOCKET_EVENTS.gameState,
      SOCKET_EVENTS.gameSpectrum,
      SOCKET_EVENTS.gamePenalty,
      SOCKET_EVENTS.gamePlayerEliminated,
      SOCKET_EVENTS.gameFinished,
      SOCKET_EVENTS.pongState,
    ]).toEqual([
      'game:input',
      'pong:input',
      'game:started',
      'game:state',
      'game:spectrum',
      'game:penalty',
      'game:player_eliminated',
      'game:finished',
      'pong:state',
    ]);
  });

  it('keeps the subject game dimensions and valid phases explicit', () => {
    expect({ width: BOARD_WIDTH, height: BOARD_HEIGHT }).toEqual({ width: 10, height: 20 });
    expect(ROOM_PHASES).toEqual(['waiting', 'running', 'finished']);
    expect(ROOM_MODES).toEqual(['solo', 'versus', 'pontrix']);
    expect(GAME_ACTIONS).toEqual([
      'move_left',
      'move_right',
      'rotate',
      'soft_drop',
      'hard_drop',
    ]);
  });

  it('provides stable protocol error codes', () => {
    expect(ERROR_CODES).toMatchObject({
      invalidPayload: 'INVALID_PAYLOAD',
      unauthorized: 'UNAUTHORIZED',
      invalidPhase: 'INVALID_PHASE',
      roomNotFound: 'ROOM_NOT_FOUND',
      notEnoughPlayers: 'NOT_ENOUGH_PLAYERS',
    });
  });
});

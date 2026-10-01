import type { Middleware } from '@reduxjs/toolkit';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/protocol.ts';
import {
  connectionChanged,
  gameFinished,
  gamePaused,
  gameResumed,
  gameStarted,
  gameStateReceived,
  hostChanged,
  inputRequested,
  joinRequested,
  leaveRequested,
  pongStateReceived,
  restartRequested,
  roomErrorReceived,
  roomStateReceived,
  spectrumReceived,
  startRequested,
} from './actions.ts';

// Owns the single socket.io connection, isolated from React components.
// Server events → dispatched actions; outgoing actions → socket.emit.
export const socketMiddleware: Middleware = ({ dispatch }) => {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();

  socket.on('connect', () => dispatch(connectionChanged(true)));
  socket.on('disconnect', () => dispatch(connectionChanged(false)));
  socket.on('room:state', (payload) => dispatch(roomStateReceived(payload)));
  socket.on('room:error', (payload) => dispatch(roomErrorReceived(payload)));
  socket.on('host:changed', (payload) => dispatch(hostChanged(payload)));
  socket.on('game:started', (payload) => dispatch(gameStarted(payload)));
  socket.on('game:finished', (payload) => dispatch(gameFinished(payload)));
  socket.on('game:paused', (payload) => dispatch(gamePaused(payload)));
  socket.on('game:resumed', (payload) => dispatch(gameResumed(payload)));
  socket.on('game:state', (payload) => dispatch(gameStateReceived(payload)));
  socket.on('game:spectrum', (payload) => dispatch(spectrumReceived(payload)));
  socket.on('pong:state', (payload) => dispatch(pongStateReceived(payload)));

  return (next) => (action) => {
    const result = next(action);
    if (joinRequested.match(action)) socket.emit('room:join', action.payload);
    else if (leaveRequested.match(action)) socket.emit('room:leave', action.payload);
    else if (startRequested.match(action)) socket.emit('room:start', action.payload);
    else if (restartRequested.match(action)) socket.emit('room:restart', action.payload);
    else if (inputRequested.match(action)) socket.emit('game:input', action.payload);
    return result;
  };
};

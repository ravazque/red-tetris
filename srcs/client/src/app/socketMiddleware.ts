import type { Middleware } from '@reduxjs/toolkit';
import { io, type Socket } from 'socket.io-client';
import type { ClientToServerEvents, ServerToClientEvents } from '../../../shared/protocol.ts';

// Owns the single socket.io connection, isolated from React components.
// Server events → dispatched actions; outgoing actions → socket.emit.
export const socketMiddleware: Middleware = () => {
  const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io();
  socket.on('connect', () => console.debug('socket connected', socket.id));

  return (next) => (action) => next(action);
};

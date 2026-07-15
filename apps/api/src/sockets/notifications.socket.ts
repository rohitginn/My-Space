import type { Server } from 'socket.io';

export function emitNotification(io: Server, userId: string, payload: Record<string, unknown>) {
  io.to(`user:${userId}`).emit('notification:new', payload);
}

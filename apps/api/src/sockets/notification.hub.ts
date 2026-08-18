import type { Server } from 'socket.io';

let server: Server | null = null;

export function setNotificationServer(value: Server) {
  server = value;
}

export function emitNotification(userId: string, notification: unknown) {
  server?.to(`user:${userId}`).emit('notification:new', notification);
}

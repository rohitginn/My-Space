import type { Server as HttpServer } from 'node:http';

import { Server } from 'socket.io';
import { eq } from 'drizzle-orm';

import { db } from '../config/db.js';
import { users } from '../db/schema/users.js';
import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import { logger } from '../utils/logger.js';
import { registerCollaborationSocket } from './collaboration.socket.js';
import { setNotificationServer } from './notification.hub.js';
import { registerKanbanSocket } from './kanban.socket.js';
import { registerCoCanvasSocket } from './co-canvas.socket.js';

export function initSockets(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.CORS_ORIGIN, credentials: true },
  });
  setNotificationServer(io);

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    if (typeof token !== 'string') {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const payload = verifyAccessToken(token);
      socket.data.userId = payload.sub;
      const user = await db.query.users.findFirst({ where: eq(users.id, payload.sub) });
      if (!user || user.deletedAt) {
        next(new Error('Unauthorized'));
        return;
      }
      socket.data.displayName = user?.displayName ?? payload.email;
      const colors = ['#0f766e', '#2563eb', '#b45309', '#be123c', '#6d28d9', '#047857'];
      socket.data.userColor = colors[Array.from(payload.sub).reduce((sum, char) => sum + char.charCodeAt(0), 0) % colors.length];
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    socket.join(`user:${socket.data.userId}`);
    registerCollaborationSocket(io, socket);
    registerKanbanSocket(io, socket);
    registerCoCanvasSocket(io, socket);
    logger.info({ userId: socket.data.userId }, 'socket connected');
  });

  return io;
}

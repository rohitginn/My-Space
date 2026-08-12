import type { Server, Socket } from 'socket.io';

import { authorizeResource } from '../modules/collaboration/collaboration.service.js';

interface RoomUser {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
}

// Map roomKey -> Map<socketId, RoomUser>
const roomUsers = new Map<string, Map<string, RoomUser>>();
const roomDocuments = new Map<string, { revision: number; documentData: unknown; updatedBy: string }>();

function removeSocketFromRoom(io: Server, socketId: string, roomKey: string) {
  const userMap = roomUsers.get(roomKey);
  if (!userMap) return;

  userMap.delete(socketId);
  if (userMap.size === 0) {
    roomUsers.delete(roomKey);
    roomDocuments.delete(roomKey);
    return;
  }

  io.to(roomKey).emit('co-canvas:presence', Array.from(userMap.values()));
}

export function registerCoCanvasSocket(io: Server, socket: Socket) {
  const authorizedRooms = new Set<string>();

  socket.on('co-canvas:join', async ({ workspaceId, canvasId }: { workspaceId: string; canvasId: string }, ack?: (result: { ok: boolean; code?: string }) => void) => {
    const roomKey = `co-canvas:${workspaceId}:${canvasId}`;
    try {
      await authorizeResource(socket.data.userId, { workspaceId, resourceId: canvasId, resourceType: 'canvas' });
    } catch (error) {
      ack?.({ ok: false, code: error instanceof Error ? error.message : 'WORKSPACE_ACCESS_DENIED' });
      return;
    }

    socket.join(roomKey);
    authorizedRooms.add(roomKey);

    if (!roomUsers.has(roomKey)) {
      roomUsers.set(roomKey, new Map());
    }

    const name = socket.data.displayName || `User ${socket.data.userId?.slice(0, 4) || 'Guest'}`;
    const color = socket.data.userColor || '#3b82f6';
    const userMap = roomUsers.get(roomKey)!;
    userMap.set(socket.id, {
      socketId: socket.id,
      userId: socket.data.userId || socket.id,
      userName: name,
      userColor: color,
    });

    // Broadcast presence update to room
    io.to(roomKey).emit('co-canvas:presence', Array.from(userMap.values()));

    const latest = roomDocuments.get(roomKey);
    if (latest) socket.emit('co-canvas:updated', { workspaceId, canvasId, ...latest });
    ack?.({ ok: true });
  });

  socket.on('co-canvas:leave', ({ workspaceId, canvasId }: { workspaceId: string; canvasId: string }) => {
    const roomKey = `co-canvas:${workspaceId}:${canvasId}`;
    socket.leave(roomKey);
    authorizedRooms.delete(roomKey);
    removeSocketFromRoom(io, socket.id, roomKey);
  });

  socket.on('co-canvas:update', async (data: { workspaceId: string; canvasId: string; documentData: unknown }) => {
    const roomKey = `co-canvas:${data.workspaceId}:${data.canvasId}`;
    const userMap = roomUsers.get(roomKey);
    if (!userMap?.has(socket.id) || !authorizedRooms.has(roomKey)) return;
    try { await authorizeResource(socket.data.userId, { workspaceId: data.workspaceId, resourceId: data.canvasId, resourceType: 'canvas' }, true); } catch { return; }

    const previous = roomDocuments.get(roomKey);
    const update = {
      workspaceId: data.workspaceId,
      canvasId: data.canvasId,
      documentData: data.documentData,
      revision: (previous?.revision ?? 0) + 1,
      updatedBy: socket.data.userId || socket.id,
    };
    roomDocuments.set(roomKey, update);
    socket.to(roomKey).emit('co-canvas:updated', update);
  });

  socket.on('co-canvas:cursor', async (data: { workspaceId: string; canvasId: string; x: number; y: number }) => {
    const roomKey = `co-canvas:${data.workspaceId}:${data.canvasId}`;
    if (!authorizedRooms.has(roomKey)) return;
    try { await authorizeResource(socket.data.userId, { workspaceId: data.workspaceId, resourceId: data.canvasId, resourceType: 'canvas' }); } catch { return; }
    socket.to(roomKey).emit('co-canvas:cursor-moved', {
      ...data,
      userId: socket.data.userId || socket.id,
      name: socket.data.displayName || 'Collaborator',
      color: socket.data.userColor || '#3b82f6',
    });
  });

  socket.on('co-canvas:comment-add', async (data: { workspaceId: string; canvasId: string; comment: unknown }) => {
    if (!authorizedRooms.has(`co-canvas:${data.workspaceId}:${data.canvasId}`)) return;
    try { await authorizeResource(socket.data.userId, { workspaceId: data.workspaceId, resourceId: data.canvasId, resourceType: 'canvas' }, true); } catch { return; }
    io.to(`co-canvas:${data.workspaceId}:${data.canvasId}`).emit('co-canvas:comment-added', data.comment);
  });

  socket.on('co-canvas:comment-toggle-resolve', async (data: { workspaceId: string; canvasId: string; commentId: string }) => {
    if (!authorizedRooms.has(`co-canvas:${data.workspaceId}:${data.canvasId}`)) return;
    try { await authorizeResource(socket.data.userId, { workspaceId: data.workspaceId, resourceId: data.canvasId, resourceType: 'canvas' }, true); } catch { return; }
    io.to(`co-canvas:${data.workspaceId}:${data.canvasId}`).emit('co-canvas:comment-resolved-toggled', data);
  });

  socket.on('disconnecting', () => {
    for (const roomKey of socket.rooms) {
      if (roomKey.startsWith('co-canvas:')) {
        authorizedRooms.delete(roomKey);
        removeSocketFromRoom(io, socket.id, roomKey);
      }
    }
  });
}

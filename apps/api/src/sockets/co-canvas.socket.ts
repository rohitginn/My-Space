import type { Server, Socket } from 'socket.io';

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
  socket.on('co-canvas:join', ({ workspaceId, canvasId, userName, userColor }: { workspaceId: string; canvasId: string; userName?: string; userColor?: string }) => {
    const roomKey = `co-canvas:${workspaceId}:${canvasId}`;
    socket.join(roomKey);

    if (!roomUsers.has(roomKey)) {
      roomUsers.set(roomKey, new Map());
    }

    const name = userName || `User ${socket.data.userId?.slice(0, 4) || 'Guest'}`;
    const color = userColor || '#3b82f6';
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
  });

  socket.on('co-canvas:leave', ({ workspaceId, canvasId }: { workspaceId: string; canvasId: string }) => {
    const roomKey = `co-canvas:${workspaceId}:${canvasId}`;
    socket.leave(roomKey);
    removeSocketFromRoom(io, socket.id, roomKey);
  });

  socket.on('co-canvas:update', (data: { workspaceId: string; canvasId: string; documentData: unknown }) => {
    const roomKey = `co-canvas:${data.workspaceId}:${data.canvasId}`;
    const userMap = roomUsers.get(roomKey);
    if (!userMap?.has(socket.id)) return;

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

  socket.on('co-canvas:cursor', (data: { workspaceId: string; canvasId: string; x: number; y: number; name: string; color: string }) => {
    socket.to(`co-canvas:${data.workspaceId}:${data.canvasId}`).emit('co-canvas:cursor-moved', {
      ...data,
      userId: socket.data.userId || socket.id,
    });
  });

  socket.on('co-canvas:comment-add', (data: { workspaceId: string; canvasId: string; comment: unknown }) => {
    io.to(`co-canvas:${data.workspaceId}:${data.canvasId}`).emit('co-canvas:comment-added', data.comment);
  });

  socket.on('co-canvas:comment-toggle-resolve', (data: { workspaceId: string; canvasId: string; commentId: string }) => {
    io.to(`co-canvas:${data.workspaceId}:${data.canvasId}`).emit('co-canvas:comment-resolved-toggled', data);
  });

  socket.on('disconnecting', () => {
    for (const roomKey of socket.rooms) {
      if (roomKey.startsWith('co-canvas:')) {
        removeSocketFromRoom(io, socket.id, roomKey);
      }
    }
  });
}

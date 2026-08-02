import type { Server, Socket } from 'socket.io';

interface RoomUser {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
}

// Map roomKey -> Map<socketId, RoomUser>
const roomUsers = new Map<string, Map<string, RoomUser>>();

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
  });

  socket.on('co-canvas:leave', ({ workspaceId, canvasId }: { workspaceId: string; canvasId: string }) => {
    const roomKey = `co-canvas:${workspaceId}:${canvasId}`;
    socket.leave(roomKey);

    const userMap = roomUsers.get(roomKey);
    if (userMap) {
      userMap.delete(socket.id);
      if (userMap.size === 0) {
        roomUsers.delete(roomKey);
      } else {
        io.to(roomKey).emit('co-canvas:presence', Array.from(userMap.values()));
      }
    }
  });

  socket.on('co-canvas:update', (data: { workspaceId: string; canvasId: string; documentData: unknown }) => {
    socket.to(`co-canvas:${data.workspaceId}:${data.canvasId}`).emit('co-canvas:updated', data);
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
        const userMap = roomUsers.get(roomKey);
        if (userMap) {
          userMap.delete(socket.id);
          if (userMap.size === 0) {
            roomUsers.delete(roomKey);
          } else {
            io.to(roomKey).emit('co-canvas:presence', Array.from(userMap.values()));
          }
        }
      }
    }
  });
}


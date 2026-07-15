import type { Server, Socket } from 'socket.io';

export function registerKanbanSocket(io: Server, socket: Socket) {
  socket.on('kanban:board:join', (boardId: string) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('kanban:card:move', (data: { boardId: string; cardId: string; toColumnId: string }) => {
    socket.to(`board:${data.boardId}`).emit('kanban:card:moved', data);
  });

  socket.on('disconnect', () => {
    io.to(`user:${socket.data.userId}`).emit('notification:new', { type: 'presence', status: 'offline' });
  });
}

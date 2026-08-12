import type { Server, Socket } from 'socket.io';

import { getBoard } from '../modules/kanban/kanban.service.js';
import { requireRole } from '../modules/workspaces/workspaces.service.js';
import { AppError } from '../utils/AppError.js';

export function registerKanbanSocket(io: Server, socket: Socket) {
  const joinedBoards = new Set<string>();

  socket.on('kanban:board:join', async (boardId: string, ack?: (result: { ok: boolean; code?: string }) => void) => {
    try {
      await getBoard(socket.data.userId, boardId);
    } catch (error) {
      ack?.({ ok: false, code: error instanceof AppError ? error.code : 'BOARD_NOT_FOUND' });
      return;
    }
    socket.join(`board:${boardId}`);
    joinedBoards.add(boardId);
    ack?.({ ok: true });
  });

  socket.on('kanban:board:leave', (boardId: string) => {
    if (!joinedBoards.delete(boardId)) return;
    socket.leave(`board:${boardId}`);
  });

  socket.on('kanban:card:move', async (data: { boardId: string; cardId: string; toColumnId: string }) => {
    if (!joinedBoards.has(data.boardId)) return;
    try {
      const board = await getBoard(socket.data.userId, data.boardId);
      if (board.workspaceId) await requireRole(socket.data.userId, board.workspaceId, ['owner', 'admin', 'member']);
    } catch {
      return;
    }
    socket.to(`board:${data.boardId}`).emit('kanban:card:moved', data);
  });

  socket.on('disconnecting', () => {
    joinedBoards.clear();
  });
}

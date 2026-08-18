import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { kanbanBoards, kanbanCards, kanbanColumns } from '../../db/schema/kanban.js';
import { AppError } from '../../utils/AppError.js';
import { getMembership, requireRole } from '../workspaces/workspaces.service.js';
import { createNotification } from '../notifications/notifications.service.js';

export async function listBoards(userId: string) {
  return db.select().from(kanbanBoards).where(eq(kanbanBoards.userId, userId)).orderBy(asc(kanbanBoards.createdAt));
}

export async function listWorkspaceBoards(userId: string, workspaceId: string) {
  await getMembership(userId, workspaceId);
  return db.select().from(kanbanBoards).where(eq(kanbanBoards.workspaceId, workspaceId)).orderBy(asc(kanbanBoards.createdAt));
}

export async function createBoard(userId: string, input: typeof kanbanBoards.$inferInsert) {
  const [created] = await db.insert(kanbanBoards).values({ ...input, userId }).returning();
  return created;
}

export async function createWorkspaceBoard(userId: string, workspaceId: string, input: { title: string; description?: string }) {
  await requireRole(userId, workspaceId, ['owner', 'admin', 'member']);
  return db.transaction(async (tx) => {
    const [created] = await tx.insert(kanbanBoards).values({ ...input, userId, workspaceId }).returning();
    const columns = [
      { boardId: created.id, title: 'To Do', color: '#64748b', sortOrder: 0 },
      { boardId: created.id, title: 'In Progress', color: '#0ea5e9', sortOrder: 1 },
      { boardId: created.id, title: 'Done', color: '#22c55e', sortOrder: 2 },
    ];
    await tx.insert(kanbanColumns).values(columns);
    return created;
  });
}

export async function getBoard(userId: string, id: string) {
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, id) });
  if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
  if (board.workspaceId) await getMembership(userId, board.workspaceId);
  else if (board.userId !== userId) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');

  const columns = await db.select().from(kanbanColumns).where(eq(kanbanColumns.boardId, id)).orderBy(asc(kanbanColumns.sortOrder));
  const cards = columns.length
    ? await db.select().from(kanbanCards).where(inArray(kanbanCards.columnId, columns.map((column) => column.id))).orderBy(asc(kanbanCards.sortOrder))
    : [];

  return { ...board, columns: columns.map((column) => ({ ...column, cards: cards.filter((card) => card.columnId === column.id) })) };
}

export async function updateBoard(userId: string, id: string, input: Partial<typeof kanbanBoards.$inferInsert>) {
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, id) });
  if (!board) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  else if (board.userId !== userId) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
  const [updated] = await db.update(kanbanBoards).set({ ...input, updatedAt: new Date() }).where(eq(kanbanBoards.id, id)).returning();
  if (!updated) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
  return updated;
}

export async function deleteBoard(userId: string, id: string) {
  const board = await db.query.kanbanBoards.findFirst({ where: eq(kanbanBoards.id, id) });
  if (!board) return;
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin']);
  else if (board.userId !== userId) return;
  await db.delete(kanbanBoards).where(eq(kanbanBoards.id, id));
}

export async function createColumn(userId: string, boardId: string, input: typeof kanbanColumns.$inferInsert) {
  const board = await getBoard(userId, boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  const [created] = await db.insert(kanbanColumns).values({ ...input, boardId }).returning();
  return created;
}

export async function updateColumn(userId: string, id: string, input: Partial<typeof kanbanColumns.$inferInsert>) {
  const column = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, id) });
  if (!column) throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
  const board = await getBoard(userId, column.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  const [updated] = await db.update(kanbanColumns).set(input).where(eq(kanbanColumns.id, id)).returning();
  if (!updated) throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
  return updated;
}

export async function deleteColumn(userId: string, id: string) {
  const column = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, id) });
  if (!column) return;
  const board = await getBoard(userId, column.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin']);
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
}

export async function reorderColumns(userId: string, items: Array<{ id: string; sortOrder: number }>) {
  const first = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, items[0]?.id ?? '') });
  if (!first) throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
  const board = await getBoard(userId, first.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(kanbanColumns).set({ sortOrder: item.sortOrder }).where(eq(kanbanColumns.id, item.id));
    }
  });
  return { reordered: items.length };
}

export async function createCard(userId: string, columnId: string, input: typeof kanbanCards.$inferInsert) {
  const column = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, columnId) });
  if (!column) throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
  const board = await getBoard(userId, column.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  if (input.assigneeId) {
    if (!board.workspaceId) throw new AppError('Personal cards cannot be assigned', 400, 'CARD_ASSIGNMENT_INVALID');
    await getMembership(input.assigneeId, board.workspaceId);
  }
  const [created] = await db.insert(kanbanCards).values({ ...input, userId, columnId }).returning();
  if (created.assigneeId && board.workspaceId) {
    await createNotification({
      userId: created.assigneeId,
      workspaceId: board.workspaceId,
      actorId: userId,
      type: 'shared_card_assignment',
      entityType: 'card',
      entityId: created.id,
      payload: { href: `/co-space/${board.workspaceId}/projects`, title: created.title },
    });
  }
  return created;
}

export async function updateCard(userId: string, id: string, input: Partial<typeof kanbanCards.$inferInsert>) {
  const existing = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, id) });
  if (!existing) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  const column = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, existing.columnId) });
  if (!column) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  const board = await getBoard(userId, column.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  else if (existing.userId !== userId) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  if (input.assigneeId) {
    if (!board.workspaceId) throw new AppError('Personal cards cannot be assigned', 400, 'CARD_ASSIGNMENT_INVALID');
    await getMembership(input.assigneeId, board.workspaceId);
  }
  const [updated] = await db.update(kanbanCards).set({ ...input, updatedAt: new Date() }).where(eq(kanbanCards.id, id)).returning();
  if (!updated) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  if (updated.assigneeId && updated.assigneeId !== existing.assigneeId && board.workspaceId) {
    await createNotification({
      userId: updated.assigneeId,
      workspaceId: board.workspaceId,
      actorId: userId,
      type: 'shared_card_assignment',
      entityType: 'card',
      entityId: updated.id,
      payload: { href: `/co-space/${board.workspaceId}/projects`, title: updated.title },
    });
  }
  return updated;
}

export async function deleteCard(userId: string, id: string) {
  const existing = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, id) });
  if (!existing) return;
  const column = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, existing.columnId) });
  if (!column) return;
  const board = await getBoard(userId, column.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  else if (existing.userId !== userId) return;
  await db.delete(kanbanCards).where(eq(kanbanCards.id, id));
}

export async function moveCard(userId: string, input: { cardId: string; toColumnId: string; affectedColumns: Array<{ cards: Array<{ id: string; sortOrder: number }> }> }) {
  const existing = await db.query.kanbanCards.findFirst({ where: eq(kanbanCards.id, input.cardId) });
  if (!existing) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  const sourceColumn = await db.query.kanbanColumns.findFirst({ where: eq(kanbanColumns.id, existing.columnId) });
  if (!sourceColumn) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  const board = await getBoard(userId, sourceColumn.boardId);
  if (board.workspaceId) await requireRole(userId, board.workspaceId, ['owner', 'admin', 'member']);
  else if (existing.userId !== userId) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  const boardColumnIds = new Set(board.columns.map((column) => column.id));
  const boardCardIds = new Set(board.columns.flatMap((column) => column.cards.map((card) => card.id)));
  if (!boardColumnIds.has(input.toColumnId) || input.affectedColumns.some((column) => column.cards.some((card) => !boardCardIds.has(card.id)))) {
    throw new AppError('Card move is invalid', 400, 'CARD_MOVE_INVALID');
  }
  await db.transaction(async (tx) => {
    await tx.update(kanbanCards).set({ columnId: input.toColumnId, updatedAt: new Date() }).where(eq(kanbanCards.id, input.cardId));
    for (const column of input.affectedColumns) {
      for (const card of column.cards) {
        await tx.update(kanbanCards).set({ sortOrder: card.sortOrder, updatedAt: new Date() }).where(eq(kanbanCards.id, card.id));
      }
    }
  });
  return { moved: true };
}

import { and, asc, eq, inArray } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { kanbanBoards, kanbanCards, kanbanColumns } from '../../db/schema/kanban.js';
import { AppError } from '../../utils/AppError.js';
import { getMembership } from '../workspaces/workspaces.service.js';

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
  await getMembership(userId, workspaceId);
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
  const [updated] = await db.update(kanbanBoards).set({ ...input, updatedAt: new Date() }).where(and(eq(kanbanBoards.id, id), eq(kanbanBoards.userId, userId))).returning();
  if (!updated) throw new AppError('Board not found', 404, 'BOARD_NOT_FOUND');
  return updated;
}

export async function deleteBoard(userId: string, id: string) {
  await db.delete(kanbanBoards).where(and(eq(kanbanBoards.id, id), eq(kanbanBoards.userId, userId)));
}

export async function createColumn(userId: string, boardId: string, input: typeof kanbanColumns.$inferInsert) {
  await getBoard(userId, boardId);
  const [created] = await db.insert(kanbanColumns).values({ ...input, boardId }).returning();
  return created;
}

export async function updateColumn(id: string, input: Partial<typeof kanbanColumns.$inferInsert>) {
  const [updated] = await db.update(kanbanColumns).set(input).where(eq(kanbanColumns.id, id)).returning();
  if (!updated) throw new AppError('Column not found', 404, 'COLUMN_NOT_FOUND');
  return updated;
}

export async function deleteColumn(id: string) {
  await db.delete(kanbanColumns).where(eq(kanbanColumns.id, id));
}

export async function reorderColumns(items: Array<{ id: string; sortOrder: number }>) {
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
  await getBoard(userId, column.boardId);
  const [created] = await db.insert(kanbanCards).values({ ...input, userId, columnId }).returning();
  return created;
}

export async function updateCard(userId: string, id: string, input: Partial<typeof kanbanCards.$inferInsert>) {
  const [updated] = await db.update(kanbanCards).set({ ...input, updatedAt: new Date() }).where(and(eq(kanbanCards.id, id), eq(kanbanCards.userId, userId))).returning();
  if (!updated) throw new AppError('Card not found', 404, 'CARD_NOT_FOUND');
  return updated;
}

export async function deleteCard(userId: string, id: string) {
  await db.delete(kanbanCards).where(and(eq(kanbanCards.id, id), eq(kanbanCards.userId, userId)));
}

export async function moveCard(userId: string, input: { cardId: string; toColumnId: string; affectedColumns: Array<{ cards: Array<{ id: string; sortOrder: number }> }> }) {
  await db.transaction(async (tx) => {
    await tx.update(kanbanCards).set({ columnId: input.toColumnId, updatedAt: new Date() }).where(and(eq(kanbanCards.id, input.cardId), eq(kanbanCards.userId, userId)));
    for (const column of input.affectedColumns) {
      for (const card of column.cards) {
        await tx.update(kanbanCards).set({ sortOrder: card.sortOrder, updatedAt: new Date() }).where(and(eq(kanbanCards.id, card.id), eq(kanbanCards.userId, userId)));
      }
    }
  });
  return { moved: true };
}

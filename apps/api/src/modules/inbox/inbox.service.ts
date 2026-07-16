import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { inboxItems } from '../../db/schema/inbox.js';
import { notes } from '../../db/schema/notes.js';
import { todos } from '../../db/schema/todos.js';
import { AppError } from '../../utils/AppError.js';

export async function listItems(userId: string) {
  return db
    .select()
    .from(inboxItems)
    .where(eq(inboxItems.userId, userId))
    .orderBy(asc(inboxItems.isProcessed), desc(inboxItems.createdAt));
}

export async function createItem(userId: string, input: { text: string }) {
  const [created] = await db.insert(inboxItems).values({ ...input, userId }).returning();
  return created;
}

export async function updateItem(userId: string, id: string, input: { text?: string; isProcessed?: boolean }) {
  const processedAt = input.isProcessed === true ? new Date() : input.isProcessed === false ? null : undefined;
  const [updated] = await db
    .update(inboxItems)
    .set({ text: input.text, isProcessed: input.isProcessed, processedAt })
    .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, userId)))
    .returning();
  if (!updated) throw new AppError('Inbox item not found', 404, 'INBOX_NOT_FOUND');
  return updated;
}

export async function deleteItem(userId: string, id: string) {
  await db.delete(inboxItems).where(and(eq(inboxItems.id, id), eq(inboxItems.userId, userId)));
}

export async function convertItem(userId: string, id: string, input: { target: 'todo' | 'note'; title?: string }) {
  const item = await db.query.inboxItems.findFirst({ where: and(eq(inboxItems.id, id), eq(inboxItems.userId, userId)) });
  if (!item) throw new AppError('Inbox item not found', 404, 'INBOX_NOT_FOUND');
  if (item.isProcessed) throw new AppError('Inbox item already processed', 400, 'INBOX_ALREADY_PROCESSED');

  let created;
  if (input.target === 'todo') {
    [created] = await db
      .insert(todos)
      .values({ userId, title: (input.title ?? item.text).slice(0, 500), description: null })
      .returning();
  } else {
    [created] = await db
      .insert(notes)
      .values({ userId, title: (input.title ?? item.text).slice(0, 255), content: item.text, folderId: null })
      .returning();
  }

  const [processed] = await db
    .update(inboxItems)
    .set({ isProcessed: true, processedAt: new Date() })
    .where(and(eq(inboxItems.id, id), eq(inboxItems.userId, userId)))
    .returning();

  // Reward XP
  const { addXP } = await import('../users/users.service.js');
  await addXP(userId, 5); // 5 XP for processing an inbox item

  return { item: processed, created };
}

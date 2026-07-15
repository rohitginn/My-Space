import { and, asc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { folders, notes } from '../../db/schema/notes.js';
import { AppError } from '../../utils/AppError.js';

export async function listFolders(userId: string) {
  return db.select().from(folders).where(eq(folders.userId, userId)).orderBy(asc(folders.sortOrder), asc(folders.name));
}

export async function createFolder(userId: string, input: typeof folders.$inferInsert) {
  const [created] = await db.insert(folders).values({ ...input, userId }).returning();
  return created;
}

export async function updateFolder(userId: string, id: string, input: Partial<typeof folders.$inferInsert>) {
  const [updated] = await db.update(folders).set(input).where(and(eq(folders.id, id), eq(folders.userId, userId))).returning();
  if (!updated) throw new AppError('Folder not found', 404, 'FOLDER_NOT_FOUND');
  return updated;
}

export async function deleteFolder(userId: string, id: string) {
  await db.transaction(async (tx) => {
    await tx.update(notes).set({ folderId: null, updatedAt: new Date() }).where(and(eq(notes.folderId, id), eq(notes.userId, userId)));
    await tx.delete(folders).where(and(eq(folders.id, id), eq(folders.userId, userId)));
  });
}

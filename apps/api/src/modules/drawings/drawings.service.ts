import { and, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { drawings } from '../../db/schema/drawings.js';
import { AppError } from '../../utils/AppError.js';

export async function listDrawings(userId: string) {
  return db
    .select()
    .from(drawings)
    .where(eq(drawings.userId, userId))
    .orderBy(desc(drawings.updatedAt));
}

export async function getDrawing(userId: string, id: string) {
  const drawing = await db.query.drawings.findFirst({
    where: and(eq(drawings.id, id), eq(drawings.userId, userId))
  });
  if (!drawing) throw new AppError('Drawing not found', 404, 'DRAWING_NOT_FOUND');
  return drawing;
}

export async function createDrawing(userId: string, input: Partial<typeof drawings.$inferInsert>) {
  const [created] = await db
    .insert(drawings)
    .values({ ...input, userId })
    .returning();
  return created;
}

export async function updateDrawing(userId: string, id: string, input: Partial<typeof drawings.$inferInsert>) {
  const [updated] = await db
    .update(drawings)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(drawings.id, id), eq(drawings.userId, userId)))
    .returning();
  if (!updated) throw new AppError('Drawing not found', 404, 'DRAWING_NOT_FOUND');
  return updated;
}

export async function deleteDrawing(userId: string, id: string) {
  const [deleted] = await db
    .delete(drawings)
    .where(and(eq(drawings.id, id), eq(drawings.userId, userId)))
    .returning();
  if (!deleted) throw new AppError('Drawing not found', 404, 'DRAWING_NOT_FOUND');
  return deleted;
}

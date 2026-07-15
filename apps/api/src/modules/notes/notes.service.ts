import { and, desc, eq, ilike } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { notes } from '../../db/schema/notes.js';
import { AppError } from '../../utils/AppError.js';
import { getOffset } from '../../utils/pagination.js';
import { sanitizeHtml } from '../../utils/sanitize.js';

type ListQuery = {
  folderId?: string;
  search?: string;
  includeTrashed: boolean;
  page: number;
  limit: number;
};

export async function listNotes(userId: string, query: ListQuery) {
  const filters = [eq(notes.userId, userId)];
  if (!query.includeTrashed) filters.push(eq(notes.isTrashed, false));
  if (query.folderId) filters.push(eq(notes.folderId, query.folderId));
  if (query.search) filters.push(ilike(notes.title, `%${query.search}%`));

  return db
    .select()
    .from(notes)
    .where(and(...filters))
    .orderBy(desc(notes.isPinned), desc(notes.updatedAt))
    .limit(query.limit)
    .offset(getOffset(query.page, query.limit));
}

export async function getNote(userId: string, id: string) {
  const note = await db.query.notes.findFirst({ where: and(eq(notes.id, id), eq(notes.userId, userId)) });
  if (!note) throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
  return note;
}

export async function createNote(userId: string, input: typeof notes.$inferInsert) {
  const [created] = await db
    .insert(notes)
    .values({ ...input, userId, content: sanitizeHtml(input.content) })
    .returning();
  return created;
}

export async function updateNote(userId: string, id: string, input: Partial<typeof notes.$inferInsert>) {
  const [updated] = await db
    .update(notes)
    .set({ ...input, content: sanitizeHtml(input.content), updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, userId)))
    .returning();
  if (!updated) throw new AppError('Note not found', 404, 'NOTE_NOT_FOUND');
  return updated;
}

export async function trashNote(userId: string, id: string) {
  return updateNote(userId, id, { isTrashed: true, trashedAt: new Date() });
}

export async function restoreNote(userId: string, id: string) {
  return updateNote(userId, id, { isTrashed: false, trashedAt: null });
}

export async function hardDeleteNote(userId: string, id: string) {
  const existing = await getNote(userId, id);
  if (!existing.isTrashed) throw new AppError('Only trashed notes can be permanently deleted', 409, 'NOTE_NOT_TRASHED');
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, userId)));
}

export async function togglePin(userId: string, id: string) {
  const existing = await getNote(userId, id);
  return updateNote(userId, id, { isPinned: !existing.isPinned });
}

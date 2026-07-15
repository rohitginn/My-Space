import { and, eq, ilike } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { kanbanCards } from '../../db/schema/kanban.js';
import { notes } from '../../db/schema/notes.js';
import { todos } from '../../db/schema/todos.js';

export async function search(userId: string, term: string) {
  const like = `%${term}%`;
  const [noteResults, todoResults, cardResults] = await Promise.all([
    db.select().from(notes).where(and(eq(notes.userId, userId), eq(notes.isTrashed, false), ilike(notes.title, like))).limit(20),
    db.select().from(todos).where(and(eq(todos.userId, userId), ilike(todos.title, like))).limit(20),
    db.select().from(kanbanCards).where(and(eq(kanbanCards.userId, userId), ilike(kanbanCards.title, like))).limit(20),
  ]);

  return {
    notes: noteResults,
    todos: todoResults,
    cards: cardResults,
  };
}

import { and, eq, ilike, or } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { journalEntries } from '../../db/schema/journal.js';
import { kanbanCards } from '../../db/schema/kanban.js';
import { notes } from '../../db/schema/notes.js';
import { todos } from '../../db/schema/todos.js';

function makeSnippet(content: string, term: string) {
  const text = content || '';
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  if (index === -1) return text.slice(0, 120);
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + term.length + 80);
  return `${start > 0 ? '…' : ''}${text.slice(start, end)}${end < text.length ? '…' : ''}`;
}

export async function search(userId: string, term: string) {
  const like = `%${term}%`;
  const [noteResults, todoResults, cardResults, journalResults] = await Promise.all([
    db.select().from(notes).where(and(eq(notes.userId, userId), eq(notes.isTrashed, false), ilike(notes.title, like))).limit(20),
    db.select().from(todos).where(and(eq(todos.userId, userId), ilike(todos.title, like))).limit(20),
    db.select().from(kanbanCards).where(and(eq(kanbanCards.userId, userId), ilike(kanbanCards.title, like))).limit(20),
    db
      .select()
      .from(journalEntries)
      .where(and(eq(journalEntries.userId, userId), or(ilike(journalEntries.content, like), ilike(journalEntries.title, like))))
      .limit(5),
  ]);

  return {
    notes: noteResults,
    todos: todoResults,
    cards: cardResults,
    journal: journalResults.map(entry => ({
      id: entry.id,
      entryDate: entry.entryDate,
      title: entry.title,
      snippet: makeSnippet(entry.content, term),
    })),
  };
}

import dayjs from 'dayjs';
import { and, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { journalEntries } from '../../db/schema/journal.js';
import { AppError } from '../../utils/AppError.js';

function computeStreaks(entryDates: Set<string>) {
  // Current streak: consecutive days with an entry, ending today or yesterday
  let cursor = dayjs().startOf('day');
  let currentStreak = 0;

  if (!entryDates.has(cursor.format('YYYY-MM-DD'))) {
    cursor = cursor.subtract(1, 'day');
  }

  while (entryDates.has(cursor.format('YYYY-MM-DD'))) {
    currentStreak += 1;
    cursor = cursor.subtract(1, 'day');
  }

  // Longest streak: longest run of consecutive days anywhere in history
  const days = Array.from(entryDates).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: dayjs.Dayjs | null = null;
  for (const day of days) {
    const current = dayjs(day);
    run = prev && current.diff(prev, 'day') === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = current;
  }

  return { currentStreak, longestStreak };
}

export async function listEntries(userId: string) {
  return db
    .select()
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId))
    .orderBy(desc(journalEntries.entryDate))
    .limit(100);
}

export async function upsertEntry(userId: string, input: typeof journalEntries.$inferInsert) {
  const existing = await db.query.journalEntries.findFirst({
    where: and(eq(journalEntries.userId, userId), eq(journalEntries.entryDate, input.entryDate)),
  });

  if (existing) {
    const [updated] = await db
      .update(journalEntries)
      .set({ title: input.title, content: input.content, mood: input.mood, updatedAt: new Date() })
      .where(and(eq(journalEntries.id, existing.id), eq(journalEntries.userId, userId)))
      .returning();
    return updated;
  }

  const [created] = await db
    .insert(journalEntries)
    .values({ ...input, userId })
    .returning();

  // Reward XP (first entry for this date only)
  const { addXP } = await import('../users/users.service.js');
  await addXP(userId, 10); // 10 XP for a new journal entry

  return created;
}

export async function updateEntry(userId: string, id: string, input: Partial<typeof journalEntries.$inferInsert>) {
  const [updated] = await db
    .update(journalEntries)
    .set({ ...input, updatedAt: new Date() })
    .where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)))
    .returning();
  if (!updated) throw new AppError('Journal entry not found', 404, 'JOURNAL_NOT_FOUND');
  return updated;
}

export async function deleteEntry(userId: string, id: string) {
  await db.delete(journalEntries).where(and(eq(journalEntries.id, id), eq(journalEntries.userId, userId)));
}

export async function getJournalStreak(userId: string) {
  const rows = await db
    .select({ entryDate: journalEntries.entryDate })
    .from(journalEntries)
    .where(eq(journalEntries.userId, userId));
  const entryDates = new Set(rows.map(r => r.entryDate));
  return computeStreaks(entryDates).currentStreak;
}

export async function statsSummary(userId: string) {
  const rows = await db.select().from(journalEntries).where(eq(journalEntries.userId, userId));
  const entryDates = new Set(rows.map(r => r.entryDate));
  const { currentStreak, longestStreak } = computeStreaks(entryDates);

  const moodCounts = { great: 0, good: 0, okay: 0, low: 0, rough: 0 };
  for (const row of rows) {
    if (row.mood && row.mood in moodCounts) {
      moodCounts[row.mood as keyof typeof moodCounts] += 1;
    }
  }

  return { totalEntries: rows.length, currentStreak, longestStreak, moodCounts };
}

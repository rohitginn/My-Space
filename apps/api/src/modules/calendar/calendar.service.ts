import { and, asc, eq, gte, lte } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { calendarEvents } from '../../db/schema/calendar.js';
import { AppError } from '../../utils/AppError.js';

export async function listEvents(userId: string, query: { start?: Date; end?: Date }) {
  const filters = [eq(calendarEvents.userId, userId)];
  if (query.start) filters.push(gte(calendarEvents.startTime, query.start));
  if (query.end) filters.push(lte(calendarEvents.endTime, query.end));
  return db.select().from(calendarEvents).where(and(...filters)).orderBy(asc(calendarEvents.startTime));
}

export async function createEvent(userId: string, input: typeof calendarEvents.$inferInsert) {
  if (input.endTime <= input.startTime) throw new AppError('Event end time must be after start time', 400, 'INVALID_EVENT_RANGE');
  const [created] = await db.insert(calendarEvents).values({ ...input, userId }).returning();
  return created;
}

export async function updateEvent(userId: string, id: string, input: Partial<typeof calendarEvents.$inferInsert>) {
  const [updated] = await db.update(calendarEvents).set(input).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId))).returning();
  if (!updated) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  return updated;
}

export async function deleteEvent(userId: string, id: string) {
  await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, userId)));
}

import { and, desc, eq, gte, sql } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { pomodoroSessions } from '../../db/schema/pomodoroSessions.js';
import { AppError } from '../../utils/AppError.js';

export const listSessions = (userId: string) => db.select().from(pomodoroSessions).where(eq(pomodoroSessions.userId, userId)).orderBy(desc(pomodoroSessions.createdAt));
export async function createSession(userId: string, input: typeof pomodoroSessions.$inferInsert) {
  const [created] = await db.insert(pomodoroSessions).values({ ...input, userId }).returning();
  return created;
}
export async function updateSession(userId: string, id: string, input: Partial<typeof pomodoroSessions.$inferInsert>) {
  const [updated] = await db.update(pomodoroSessions).set(input).where(and(eq(pomodoroSessions.id, id), eq(pomodoroSessions.userId, userId))).returning();
  if (!updated) throw new AppError('Pomodoro session not found', 404, 'POMODORO_NOT_FOUND');
  return updated;
}
export const deleteSession = (userId: string, id: string) => db.delete(pomodoroSessions).where(and(eq(pomodoroSessions.id, id), eq(pomodoroSessions.userId, userId)));
export function stats(userId: string, since: Date) {
  return db
    .select({ type: pomodoroSessions.type, sessions: sql<number>`count(*)`, totalSeconds: sql<number>`sum(${pomodoroSessions.duration})` })
    .from(pomodoroSessions)
    .where(and(eq(pomodoroSessions.userId, userId), gte(pomodoroSessions.createdAt, since)))
    .groupBy(pomodoroSessions.type);
}

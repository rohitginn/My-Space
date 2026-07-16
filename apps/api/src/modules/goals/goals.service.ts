import { and, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { goals } from '../../db/schema/goals.js';
import { AppError } from '../../utils/AppError.js';

export const listGoals = (userId: string) => db.select().from(goals).where(eq(goals.userId, userId)).orderBy(desc(goals.createdAt));
export async function createGoal(userId: string, input: typeof goals.$inferInsert) {
  const [created] = await db.insert(goals).values({ ...input, userId }).returning();
  return created;
}
export async function updateGoal(userId: string, id: string, input: Partial<typeof goals.$inferInsert>) {
  const original = await db.query.goals.findFirst({
    where: and(eq(goals.id, id), eq(goals.userId, userId))
  });
  if (!original) throw new AppError('Goal not found', 404, 'GOAL_NOT_FOUND');

  const [updated] = await db.update(goals).set({ ...input, updatedAt: new Date() }).where(and(eq(goals.id, id), eq(goals.userId, userId))).returning();
  
  if (input.status === 'completed' && original.status !== 'completed') {
    const { addXP } = await import('../users/users.service.js');
    await addXP(userId, 50); // 50 XP for completing a goal
  }
  
  return updated;
}
export const deleteGoal = (userId: string, id: string) => db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, userId)));

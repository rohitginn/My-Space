import { and, desc, eq, sql } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { expenses } from '../../db/schema/expenses.js';
import { AppError } from '../../utils/AppError.js';

export const listExpenses = (userId: string) => db.select().from(expenses).where(eq(expenses.userId, userId)).orderBy(desc(expenses.date));
export async function createExpense(userId: string, input: typeof expenses.$inferInsert) {
  const [created] = await db.insert(expenses).values({ ...input, userId }).returning();
  return created;
}
export async function updateExpense(userId: string, id: string, input: Partial<typeof expenses.$inferInsert>) {
  const [updated] = await db.update(expenses).set(input).where(and(eq(expenses.id, id), eq(expenses.userId, userId))).returning();
  if (!updated) throw new AppError('Expense not found', 404, 'EXPENSE_NOT_FOUND');
  return updated;
}
export const deleteExpense = (userId: string, id: string) => db.delete(expenses).where(and(eq(expenses.id, id), eq(expenses.userId, userId)));
export function monthlySummary(userId: string) {
  return db
    .select({ month: sql<string>`to_char(${expenses.date}, 'YYYY-MM')`, total: sql<string>`sum(${expenses.amount})` })
    .from(expenses)
    .where(eq(expenses.userId, userId))
    .groupBy(sql`to_char(${expenses.date}, 'YYYY-MM')`)
    .orderBy(sql`to_char(${expenses.date}, 'YYYY-MM') desc`);
}

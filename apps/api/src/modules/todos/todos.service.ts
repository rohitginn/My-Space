import { and, asc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { todos } from '../../db/schema/todos.js';
import { AppError } from '../../utils/AppError.js';
import { getOffset } from '../../utils/pagination.js';

type ListQuery = {
  completed?: boolean;
  priority?: string;
  page: number;
  limit: number;
};

export async function listTodos(userId: string, query: ListQuery) {
  const filters = [eq(todos.userId, userId)];
  if (typeof query.completed === 'boolean') filters.push(eq(todos.isCompleted, query.completed));
  if (query.priority) filters.push(eq(todos.priority, query.priority));

  return db.select().from(todos).where(and(...filters)).orderBy(asc(todos.sortOrder), asc(todos.createdAt)).limit(query.limit).offset(getOffset(query.page, query.limit));
}

export async function createTodo(userId: string, input: typeof todos.$inferInsert) {
  const [created] = await db.insert(todos).values({ ...input, userId }).returning();
  return created;
}

export async function updateTodo(userId: string, id: string, input: Partial<typeof todos.$inferInsert>) {
  const completedAt = input.isCompleted === true ? new Date() : input.isCompleted === false ? null : undefined;
  const [updated] = await db
    .update(todos)
    .set({ ...input, completedAt, updatedAt: new Date() })
    .where(and(eq(todos.id, id), eq(todos.userId, userId)))
    .returning();
  if (!updated) throw new AppError('Todo not found', 404, 'TODO_NOT_FOUND');
  return updated;
}

export async function toggleTodo(userId: string, id: string) {
  const todo = await db.query.todos.findFirst({ where: and(eq(todos.id, id), eq(todos.userId, userId)) });
  if (!todo) throw new AppError('Todo not found', 404, 'TODO_NOT_FOUND');
  
  const isCompleting = !todo.isCompleted;
  const updated = await updateTodo(userId, id, { isCompleted: isCompleting });
  
  if (isCompleting) {
    const { addXP } = await import('../users/users.service.js');
    await addXP(userId, 10); // Reward 10 XP for task completion
  }
  
  return updated;
}

export async function deleteTodo(userId: string, id: string) {
  await db.delete(todos).where(and(eq(todos.id, id), eq(todos.userId, userId)));
}

export async function addSubtask(userId: string, id: string, input: typeof todos.$inferInsert) {
  return createTodo(userId, { ...input, parentId: id });
}

export async function reorderTodos(userId: string, items: Array<{ id: string; sortOrder: number }>) {
  await db.transaction(async (tx) => {
    for (const item of items) {
      await tx.update(todos).set({ sortOrder: item.sortOrder, updatedAt: new Date() }).where(and(eq(todos.id, item.id), eq(todos.userId, userId)));
    }
  });
  return { reordered: items.length };
}

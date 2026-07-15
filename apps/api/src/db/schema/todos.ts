import { type AnyPgColumn, boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const todos = pgTable('todos', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  isCompleted: boolean('is_completed').default(false),
  priority: varchar('priority', { length: 10 }).default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  reminder: timestamp('reminder', { withTimezone: true }),
  parentId: uuid('parent_id').references((): AnyPgColumn => todos.id, { onDelete: 'cascade' }),
  sortOrder: integer('sort_order').default(0),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

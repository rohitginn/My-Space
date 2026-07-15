import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { todos } from './todos.js';
import { users } from './users.js';

export const pomodoroSessions = pgTable('pomodoro_sessions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  todoId: uuid('todo_id').references(() => todos.id, { onDelete: 'set null' }),
  duration: integer('duration').notNull(),
  type: varchar('type', { length: 20 }).notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

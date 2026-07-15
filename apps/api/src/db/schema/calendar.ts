import { boolean, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { todos } from './todos.js';
import { users } from './users.js';

export const calendarEvents = pgTable('calendar_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  startTime: timestamp('start_time', { withTimezone: true }).notNull(),
  endTime: timestamp('end_time', { withTimezone: true }).notNull(),
  isAllDay: boolean('is_all_day').default(false),
  color: varchar('color', { length: 7 }),
  recurrence: varchar('recurrence', { length: 50 }),
  todoId: uuid('todo_id').references(() => todos.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

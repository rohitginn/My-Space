import { integer, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const habits = pgTable('habits', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 7 }),
  frequency: varchar('frequency', { length: 20 }).default('daily'),
  targetCount: integer('target_count').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const habitLogs = pgTable('habit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  habitId: uuid('habit_id').notNull().references(() => habits.id, { onDelete: 'cascade' }),
  logDate: timestamp('log_date', { withTimezone: true }).notNull(),
  count: integer('count').default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).default('personal'),
  color: varchar('color', { length: 7 }).default('#3b82f6'),
  milestones: text('milestones'), // JSON string array of { id, title, completed }
  targetDate: timestamp('target_date', { withTimezone: true }),
  progress: integer('progress').default(0),
  status: varchar('status', { length: 20 }).default('active'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

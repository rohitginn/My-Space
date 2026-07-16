import { boolean, integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const routines = pgTable('routines', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 100 }).notNull(),
  description: text('description'),
  purpose: text('purpose'),
  durationType: varchar('duration_type', { length: 20 }).default('weeks'),
  durationValue: integer('duration_value').default(4),
  isActive: boolean('is_active').default(false),
  startDate: timestamp('start_date', { withTimezone: true }),
  habitsJson: text('habits_json').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

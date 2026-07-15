import { pgTable, timestamp, uuid, varchar, jsonb } from 'drizzle-orm/pg-core';
import { users } from './users.js';

export const drawings = pgTable('drawings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).default('Untitled Drawing').notNull(),
  documentData: jsonb('document_data').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

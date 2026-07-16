import { pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const journalEntries = pgTable(
  'journal_entries',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    entryDate: varchar('entry_date', { length: 10 }).notNull(), // 'YYYY-MM-DD'
    title: varchar('title', { length: 300 }),
    content: text('content').notNull().default(''),
    mood: varchar('mood', { length: 20 }), // 'great' | 'good' | 'okay' | 'low' | 'rough'
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    userDateUnique: uniqueIndex('journal_entries_user_id_entry_date_unique').on(table.userId, table.entryDate),
  }),
);

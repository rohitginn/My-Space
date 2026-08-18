import { integer, pgTable, text, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { notes } from './notes.js';
import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const kanbanBoards = pgTable('kanban_boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 200 }).notNull(),
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const kanbanColumns = pgTable('kanban_columns', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').notNull().references(() => kanbanBoards.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 100 }).notNull(),
  color: varchar('color', { length: 7 }),
  sortOrder: integer('sort_order').default(0),
  wipLimit: integer('wip_limit'),
});

export const kanbanCards = pgTable('kanban_cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  columnId: uuid('column_id').notNull().references(() => kanbanColumns.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  assigneeId: uuid('assignee_id').references(() => users.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 300 }).notNull(),
  description: text('description'),
  priority: varchar('priority', { length: 10 }).default('medium'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  sortOrder: integer('sort_order').default(0),
  noteId: uuid('note_id').references(() => notes.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

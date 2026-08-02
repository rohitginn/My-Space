import { jsonb, pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const coCanvases = pgTable('co_canvases', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 300 }).notNull(),
  documentData: jsonb('document_data').default({}).notNull(),
  createdById: uuid('created_by_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const canvasComments = pgTable('canvas_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  canvasId: uuid('canvas_id').notNull().references(() => coCanvases.id, { onDelete: 'cascade' }),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  userName: varchar('user_name', { length: 200 }).notNull().default('Collaborator'),
  x: jsonb('x').notNull(),
  y: jsonb('y').notNull(),
  content: varchar('content', { length: 1000 }).notNull(),
  isResolved: timestamp('is_resolved', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

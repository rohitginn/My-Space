import { integer, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { workspaces } from './workspaces.js';

export const collaborationDocuments = pgTable('collaboration_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  resourceType: varchar('resource_type', { length: 20 }).notNull(),
  resourceId: uuid('resource_id').notNull(),
  state: text('state').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('collaboration_documents_resource_unique').on(table.workspaceId, table.resourceType, table.resourceId),
]);

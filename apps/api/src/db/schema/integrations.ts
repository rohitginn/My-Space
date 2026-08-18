import { jsonb, pgTable, timestamp, uniqueIndex, uuid, varchar, text } from 'drizzle-orm/pg-core';

import { users } from './users.js';
import { workspaces } from './workspaces.js';

export const workspaceIntegrations = pgTable('workspace_integrations', {
  id: uuid('id').defaultRandom().primaryKey(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 30 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('connected'),
  installedById: uuid('installed_by_id').notNull().references(() => users.id, { onDelete: 'restrict' }),
  externalAccountId: varchar('external_account_id', { length: 255 }),
  externalAccountName: varchar('external_account_name', { length: 255 }),
  accessTokenEncrypted: text('access_token_encrypted').notNull(),
  refreshTokenEncrypted: text('refresh_token_encrypted'),
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
  scopes: jsonb('scopes').$type<string[]>().notNull().default([]),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().notNull().default({}),
  lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => [
  uniqueIndex('workspace_integrations_provider_unique').on(table.workspaceId, table.provider),
]);

export const integrationOauthStates = pgTable('integration_oauth_states', {
  id: uuid('id').defaultRandom().primaryKey(),
  stateHash: varchar('state_hash', { length: 64 }).notNull().unique(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: varchar('provider', { length: 30 }).notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

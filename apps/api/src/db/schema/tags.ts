import { pgTable, uniqueIndex, uuid, varchar } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const tags = pgTable(
  'tags',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 50 }).notNull(),
    color: varchar('color', { length: 7 }),
  },
  (table) => ({
    userNameUnique: uniqueIndex('tags_user_id_name_unique').on(table.userId, table.name),
  }),
);

export const taggables = pgTable('taggables', {
  id: uuid('id').defaultRandom().primaryKey(),
  tagId: uuid('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
  taggableId: uuid('taggable_id').notNull(),
  taggableType: varchar('taggable_type', { length: 20 }).notNull(),
});

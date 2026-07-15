import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const listNotesQuerySchema = z.object({
  folderId: z.string().uuid().optional(),
  search: z.string().optional(),
  includeTrashed: z.coerce.boolean().default(false),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createNoteSchema = z.object({
  folderId: z.string().uuid().nullable().optional(),
  title: z.string().min(1).max(255).default('Untitled'),
  content: z.string().nullable().optional(),
  contentType: z.enum(['markdown', 'richtext']).default('markdown'),
  isPinned: z.boolean().optional(),
});

export const updateNoteSchema = createNoteSchema.partial();

export const createFolderSchema = z.object({
  name: z.string().min(1).max(100),
  parentId: z.string().uuid().nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateFolderSchema = createFolderSchema.partial();

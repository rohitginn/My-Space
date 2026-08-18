import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const createBoardSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().nullable().optional(),
});

export const updateBoardSchema = createBoardSchema.partial();

export const createColumnSchema = z.object({
  title: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  sortOrder: z.number().int().optional(),
  wipLimit: z.number().int().positive().nullable().optional(),
});

export const updateColumnSchema = createColumnSchema.partial();

export const createCardSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  dueDate: z.coerce.date().nullable().optional(),
  sortOrder: z.number().int().optional(),
  noteId: z.string().uuid().nullable().optional(),
  assigneeId: z.string().uuid().nullable().optional(),
});

export const updateCardSchema = createCardSchema.partial().extend({
  columnId: z.string().uuid().optional(),
});

export const reorderColumnsSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })).min(1),
});

export const moveCardSchema = z.object({
  cardId: z.string().uuid(),
  toColumnId: z.string().uuid(),
  affectedColumns: z.array(z.object({
    columnId: z.string().uuid(),
    cards: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })),
  })).min(1),
});

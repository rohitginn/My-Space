import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const listTodosQuerySchema = z.object({
  completed: z.coerce.boolean().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const createTodoSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().nullable().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  energyLevel: z.enum(['low', 'medium', 'high']).default('medium'),
  durationMinutes: z.coerce.number().int().positive().nullable().optional(),
  scheduledStart: z.coerce.date().nullable().optional(),
  scheduledEnd: z.coerce.date().nullable().optional(),
  dueDate: z.coerce.date().nullable().optional(),
  reminder: z.coerce.date().nullable().optional(),
  parentId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().optional(),
});

export const updateTodoSchema = createTodoSchema.partial().extend({
  isCompleted: z.boolean().optional(),
});

export const reorderTodosSchema = z.object({
  items: z.array(z.object({ id: z.string().uuid(), sortOrder: z.number().int() })).min(1),
});

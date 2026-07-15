import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const sessionSchema = z.object({
  todoId: z.string().uuid().nullable().optional(),
  duration: z.number().int().positive(),
  type: z.enum(['focus', 'short_break', 'long_break']),
  completedAt: z.coerce.date().nullable().optional(),
});
export const updateSessionSchema = sessionSchema.partial();

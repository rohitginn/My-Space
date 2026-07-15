import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const goalSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().nullable().optional(),
  targetDate: z.coerce.date().nullable().optional(),
  progress: z.number().int().min(0).max(100).default(0),
  status: z.enum(['active', 'completed', 'archived']).default('active'),
});
export const updateGoalSchema = goalSchema.partial();

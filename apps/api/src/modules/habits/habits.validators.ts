import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const logParamsSchema = z.object({ id: z.string().uuid(), date: z.string() });
export const habitSchema = z.object({
  name: z.string().min(1).max(100),
  icon: z.string().max(50).nullable().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  frequency: z.enum(['daily', 'weekly']).default('daily'),
  targetCount: z.number().int().positive().default(1),
});
export const updateHabitSchema = habitSchema.partial();
export const logHabitSchema = z.object({ logDate: z.coerce.date().default(() => new Date()), count: z.number().int().positive().default(1) });

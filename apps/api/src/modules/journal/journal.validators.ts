import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const moodSchema = z.enum(['great', 'good', 'okay', 'low', 'rough']);

export const upsertEntrySchema = z.object({
  entryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title: z.string().max(300).nullable().optional(),
  content: z.string().max(50000),
  mood: moodSchema.nullable().optional(),
});

export const updateEntrySchema = z.object({
  title: z.string().max(300).nullable().optional(),
  content: z.string().max(50000).optional(),
  mood: moodSchema.nullable().optional(),
});

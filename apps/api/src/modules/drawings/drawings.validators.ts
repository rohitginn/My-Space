import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const createDrawingSchema = z.object({
  title: z.string().min(1).max(255).default('Untitled Drawing').optional(),
  documentData: z.record(z.any()).optional(),
});

export const updateDrawingSchema = createDrawingSchema.partial();

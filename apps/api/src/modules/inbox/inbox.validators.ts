import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });

export const createItemSchema = z.object({
  text: z.string().min(1).max(1000),
});

export const updateItemSchema = z.object({
  text: z.string().min(1).max(1000).optional(),
  isProcessed: z.boolean().optional(),
});

export const convertItemSchema = z.object({
  target: z.enum(['todo', 'note']),
  title: z.string().max(500).optional(),
});

import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const listEventsQuerySchema = z.object({ start: z.coerce.date().optional(), end: z.coerce.date().optional() });
export const eventSchema = z.object({
  title: z.string().min(1).max(300),
  description: z.string().nullable().optional(),
  startTime: z.coerce.date(),
  endTime: z.coerce.date(),
  isAllDay: z.boolean().optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional(),
  recurrence: z.enum(['daily', 'weekly', 'monthly']).nullable().optional(),
  todoId: z.string().uuid().nullable().optional(),
});
export const updateEventSchema = eventSchema.partial();

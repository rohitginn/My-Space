import { z } from 'zod';

export const idParamsSchema = z.object({ id: z.string().uuid() });
export const expenseSchema = z.object({
  title: z.string().min(1).max(200),
  amount: z.coerce.string(),
  currency: z.string().length(3).default('INR'),
  category: z.string().max(50).nullable().optional(),
  date: z.coerce.date(),
  isRecurring: z.boolean().optional(),
  notes: z.string().nullable().optional(),
});
export const updateExpenseSchema = expenseSchema.partial();

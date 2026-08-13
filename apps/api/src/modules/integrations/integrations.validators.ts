import { z } from 'zod';

export const workspaceIntegrationParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const providerParamsSchema = z.object({ workspaceId: z.string().uuid(), provider: z.string().min(1).max(30) });
export const callbackQuerySchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1),
  error: z.string().optional(),
});

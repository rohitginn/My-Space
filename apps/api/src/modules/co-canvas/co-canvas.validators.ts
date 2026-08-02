import { z } from 'zod';

export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const canvasParamsSchema = z.object({ workspaceId: z.string().uuid(), canvasId: z.string().uuid() });
export const createCanvasSchema = z.object({ title: z.string().min(1).max(300), documentData: z.record(z.any()).optional() });
export const updateCanvasSchema = createCanvasSchema.partial();

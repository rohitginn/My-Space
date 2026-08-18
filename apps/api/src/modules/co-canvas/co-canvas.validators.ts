import { z } from 'zod';

export const createCanvasCommentSchema = z.object({
  x: z.number(),
  y: z.number(),
  content: z.string().min(1, 'Comment content is required'),
});

export const workspaceCanvasParamsSchema = z.object({
  workspaceId: z.string().uuid(),
  canvasId: z.string().uuid(),
});

export const commentIdParamsSchema = z.object({
  commentId: z.string().uuid(),
});
export const workspaceParamsSchema = z.object({ workspaceId: z.string().uuid() });
export const canvasParamsSchema = z.object({ workspaceId: z.string().uuid(), canvasId: z.string().uuid() });
export const commentParamsSchema = canvasParamsSchema.extend({ commentId: z.string().uuid() });
export const createCanvasSchema = z.object({ title: z.string().min(1).max(300), documentData: z.record(z.any()).optional() });
export const updateCanvasSchema = createCanvasSchema.partial();
export const createCommentSchema = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  content: z.string().trim().min(1).max(1000),
});
export const resolveCommentSchema = z.object({ isResolved: z.boolean() });

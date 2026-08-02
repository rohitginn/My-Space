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

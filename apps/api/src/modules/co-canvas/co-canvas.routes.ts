import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.js';
import { validate } from '../../middleware/validate.js';
import * as controller from './co-canvas.controller.js';
import {
  createCanvasCommentSchema,
  workspaceCanvasParamsSchema,
  commentIdParamsSchema,
} from './co-canvas.validators.js';

export const coCanvasCommentRoutes = Router();

coCanvasCommentRoutes.use(authenticate);

coCanvasCommentRoutes.get(
  '/workspaces/:workspaceId/canvases/:canvasId/comments',
  validate({ params: workspaceCanvasParamsSchema }),
  controller.listCanvasComments
);

coCanvasCommentRoutes.post(
  '/workspaces/:workspaceId/canvases/:canvasId/comments',
  validate({ params: workspaceCanvasParamsSchema, body: createCanvasCommentSchema }),
  controller.createCanvasComment
);

coCanvasCommentRoutes.patch(
  '/comments/:commentId/toggle-resolve',
  validate({ params: commentIdParamsSchema }),
  controller.toggleResolveComment
);

coCanvasCommentRoutes.delete(
  '/comments/:commentId',
  validate({ params: commentIdParamsSchema }),
  controller.deleteCanvasComment
);

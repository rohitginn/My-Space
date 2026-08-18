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
import { canvasParamsSchema, commentParamsSchema, createCanvasSchema, createCommentSchema, resolveCommentSchema, updateCanvasSchema, workspaceParamsSchema } from './co-canvas.validators.js';

export const coCanvasRoutes = Router();
coCanvasRoutes.get('/workspaces/:workspaceId/canvases', validate({ params: workspaceParamsSchema }), controller.listCanvases);
coCanvasRoutes.post('/workspaces/:workspaceId/canvases', validate({ params: workspaceParamsSchema, body: createCanvasSchema }), controller.createCanvas);
coCanvasRoutes.get('/workspaces/:workspaceId/canvases/:canvasId', validate({ params: canvasParamsSchema }), controller.getCanvas);
coCanvasRoutes.patch('/workspaces/:workspaceId/canvases/:canvasId', validate({ params: canvasParamsSchema, body: updateCanvasSchema }), controller.updateCanvas);
coCanvasRoutes.delete('/workspaces/:workspaceId/canvases/:canvasId', validate({ params: canvasParamsSchema }), controller.deleteCanvas);
coCanvasRoutes.get('/workspaces/:workspaceId/canvases/:canvasId/comments', validate({ params: canvasParamsSchema }), controller.listComments);
coCanvasRoutes.post('/workspaces/:workspaceId/canvases/:canvasId/comments', validate({ params: canvasParamsSchema, body: createCommentSchema }), controller.createComment);
coCanvasRoutes.patch('/workspaces/:workspaceId/canvases/:canvasId/comments/:commentId', validate({ params: commentParamsSchema, body: resolveCommentSchema }), controller.resolveComment);

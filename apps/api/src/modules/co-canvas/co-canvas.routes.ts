import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './co-canvas.controller.js';
import { canvasParamsSchema, createCanvasSchema, updateCanvasSchema, workspaceParamsSchema } from './co-canvas.validators.js';

export const coCanvasRoutes = Router();
coCanvasRoutes.get('/workspaces/:workspaceId/canvases', validate({ params: workspaceParamsSchema }), controller.listCanvases);
coCanvasRoutes.post('/workspaces/:workspaceId/canvases', validate({ params: workspaceParamsSchema, body: createCanvasSchema }), controller.createCanvas);
coCanvasRoutes.get('/workspaces/:workspaceId/canvases/:canvasId', validate({ params: canvasParamsSchema }), controller.getCanvas);
coCanvasRoutes.patch('/workspaces/:workspaceId/canvases/:canvasId', validate({ params: canvasParamsSchema, body: updateCanvasSchema }), controller.updateCanvas);
coCanvasRoutes.delete('/workspaces/:workspaceId/canvases/:canvasId', validate({ params: canvasParamsSchema }), controller.deleteCanvas);

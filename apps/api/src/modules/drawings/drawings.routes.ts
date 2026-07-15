import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './drawings.controller.js';
import { createDrawingSchema, idParamsSchema, updateDrawingSchema } from './drawings.validators.js';

export const drawingsRoutes = Router();

drawingsRoutes.get('/', controller.listDrawings);
drawingsRoutes.get('/:id', validate({ params: idParamsSchema }), controller.getDrawing);
drawingsRoutes.post('/', validate({ body: createDrawingSchema }), controller.createDrawing);
drawingsRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateDrawingSchema }), controller.updateDrawing);
drawingsRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteDrawing);

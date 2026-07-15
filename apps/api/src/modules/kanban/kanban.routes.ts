import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './kanban.controller.js';
import { createBoardSchema, createCardSchema, createColumnSchema, idParamsSchema, moveCardSchema, reorderColumnsSchema, updateBoardSchema, updateCardSchema, updateColumnSchema } from './kanban.validators.js';

export const kanbanRoutes = Router();

kanbanRoutes.get('/boards', controller.listBoards);
kanbanRoutes.post('/boards', validate({ body: createBoardSchema }), controller.createBoard);
kanbanRoutes.get('/boards/:id', validate({ params: idParamsSchema }), controller.getBoard);
kanbanRoutes.patch('/boards/:id', validate({ params: idParamsSchema, body: updateBoardSchema }), controller.updateBoard);
kanbanRoutes.delete('/boards/:id', validate({ params: idParamsSchema }), controller.deleteBoard);
kanbanRoutes.post('/boards/:id/columns', validate({ params: idParamsSchema, body: createColumnSchema }), controller.createColumn);
kanbanRoutes.patch('/columns/reorder', validate({ body: reorderColumnsSchema }), controller.reorderColumns);
kanbanRoutes.patch('/columns/:id', validate({ params: idParamsSchema, body: updateColumnSchema }), controller.updateColumn);
kanbanRoutes.delete('/columns/:id', validate({ params: idParamsSchema }), controller.deleteColumn);
kanbanRoutes.post('/columns/:id/cards', validate({ params: idParamsSchema, body: createCardSchema }), controller.createCard);
kanbanRoutes.patch('/cards/move', validate({ body: moveCardSchema }), controller.moveCard);
kanbanRoutes.patch('/cards/:id', validate({ params: idParamsSchema, body: updateCardSchema }), controller.updateCard);
kanbanRoutes.delete('/cards/:id', validate({ params: idParamsSchema }), controller.deleteCard);

import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './inbox.controller.js';
import { convertItemSchema, createItemSchema, idParamsSchema, updateItemSchema } from './inbox.validators.js';

export const inboxRoutes = Router();

inboxRoutes.get('/', controller.listItems);
inboxRoutes.post('/', validate({ body: createItemSchema }), controller.createItem);
inboxRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateItemSchema }), controller.updateItem);
inboxRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteItem);
inboxRoutes.post('/:id/convert', validate({ params: idParamsSchema, body: convertItemSchema }), controller.convertItem);

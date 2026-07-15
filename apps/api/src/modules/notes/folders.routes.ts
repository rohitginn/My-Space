import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './folders.controller.js';
import { createFolderSchema, idParamsSchema, updateFolderSchema } from './notes.validators.js';

export const foldersRoutes = Router();

foldersRoutes.get('/', controller.listFolders);
foldersRoutes.post('/', validate({ body: createFolderSchema }), controller.createFolder);
foldersRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateFolderSchema }), controller.updateFolder);
foldersRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteFolder);

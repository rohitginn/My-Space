import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './notes.controller.js';
import { createNoteSchema, idParamsSchema, listNotesQuerySchema, updateNoteSchema } from './notes.validators.js';

export const notesRoutes = Router();

notesRoutes.get('/', validate({ query: listNotesQuerySchema }), controller.listNotes);
notesRoutes.get('/:id', validate({ params: idParamsSchema }), controller.getNote);
notesRoutes.post('/', validate({ body: createNoteSchema }), controller.createNote);
notesRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateNoteSchema }), controller.updateNote);
notesRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.trashNote);
notesRoutes.post('/:id/restore', validate({ params: idParamsSchema }), controller.restoreNote);
notesRoutes.delete('/:id/permanent', validate({ params: idParamsSchema }), controller.hardDeleteNote);
notesRoutes.patch('/:id/pin', validate({ params: idParamsSchema }), controller.togglePin);

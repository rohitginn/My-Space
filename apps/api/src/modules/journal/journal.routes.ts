import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './journal.controller.js';
import { idParamsSchema, updateEntrySchema, upsertEntrySchema } from './journal.validators.js';

export const journalRoutes = Router();

journalRoutes.get('/stats/summary', controller.statsSummary);

journalRoutes.get('/', controller.listEntries);
journalRoutes.post('/', validate({ body: upsertEntrySchema }), controller.upsertEntry);
journalRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateEntrySchema }), controller.updateEntry);
journalRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteEntry);

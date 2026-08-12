import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './notifications.controller.js';
import { notificationIdSchema } from './notifications.validators.js';

export const notificationsRoutes = Router();

notificationsRoutes.get('/', controller.listNotifications);
notificationsRoutes.post('/read-all', controller.markAllRead);
notificationsRoutes.post('/:id/read', validate({ params: notificationIdSchema }), controller.markRead);

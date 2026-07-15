import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './pomodoro.controller.js';
import { idParamsSchema, sessionSchema, updateSessionSchema } from './pomodoro.validators.js';

export const pomodoroRoutes = Router();

pomodoroRoutes.get('/', controller.listSessions);
pomodoroRoutes.get('/stats/daily', controller.dailyStats);
pomodoroRoutes.get('/stats/weekly', controller.weeklyStats);
pomodoroRoutes.post('/', validate({ body: sessionSchema }), controller.createSession);
pomodoroRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateSessionSchema }), controller.updateSession);
pomodoroRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteSession);

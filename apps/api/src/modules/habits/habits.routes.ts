import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './habits.controller.js';
import { habitSchema, idParamsSchema, logHabitSchema, logParamsSchema, updateHabitSchema } from './habits.validators.js';

export const habitsRoutes = Router();

habitsRoutes.get('/routines', controller.listRoutines);
habitsRoutes.post('/routines', controller.createRoutine);
habitsRoutes.post('/routines/:id/apply', controller.applyRoutine);

habitsRoutes.get('/', controller.listHabits);
habitsRoutes.post('/', validate({ body: habitSchema }), controller.createHabit);
habitsRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateHabitSchema }), controller.updateHabit);
habitsRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteHabit);
habitsRoutes.post('/:id/log', validate({ params: idParamsSchema, body: logHabitSchema }), controller.logHabit);
habitsRoutes.delete('/:id/log/:date', validate({ params: logParamsSchema }), controller.deleteHabitLog);
habitsRoutes.get('/:id/stats', validate({ params: idParamsSchema }), controller.habitStats);


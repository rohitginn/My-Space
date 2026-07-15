import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './goals.controller.js';
import { goalSchema, idParamsSchema, updateGoalSchema } from './goals.validators.js';

export const goalsRoutes = Router();

goalsRoutes.get('/', controller.listGoals);
goalsRoutes.post('/', validate({ body: goalSchema }), controller.createGoal);
goalsRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateGoalSchema }), controller.updateGoal);
goalsRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteGoal);

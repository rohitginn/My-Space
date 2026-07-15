import { Router } from 'express';

import { validate } from '../../middleware/validate.js';
import * as controller from './expenses.controller.js';
import { expenseSchema, idParamsSchema, updateExpenseSchema } from './expenses.validators.js';

export const expensesRoutes = Router();

expensesRoutes.get('/', controller.listExpenses);
expensesRoutes.get('/summary/monthly', controller.monthlySummary);
expensesRoutes.post('/', validate({ body: expenseSchema }), controller.createExpense);
expensesRoutes.patch('/:id', validate({ params: idParamsSchema, body: updateExpenseSchema }), controller.updateExpense);
expensesRoutes.delete('/:id', validate({ params: idParamsSchema }), controller.deleteExpense);

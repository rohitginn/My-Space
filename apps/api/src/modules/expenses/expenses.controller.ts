import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './expenses.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listExpenses = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listExpenses(userId(req)) }));
export const createExpense = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createExpense(userId(req), req.body) }));
export const updateExpense = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateExpense(userId(req), req.params.id, req.body) }));
export const deleteExpense = asyncHandler(async (req, res) => {
  await service.deleteExpense(userId(req), req.params.id);
  res.status(204).send();
});
export const monthlySummary = asyncHandler(async (req, res) => res.json({ success: true, data: await service.monthlySummary(userId(req)) }));

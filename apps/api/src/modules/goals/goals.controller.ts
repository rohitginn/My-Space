import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './goals.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listGoals = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listGoals(userId(req)) }));
export const createGoal = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createGoal(userId(req), req.body) }));
export const updateGoal = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateGoal(userId(req), req.params.id, req.body) }));
export const deleteGoal = asyncHandler(async (req, res) => {
  await service.deleteGoal(userId(req), req.params.id);
  res.status(204).send();
});

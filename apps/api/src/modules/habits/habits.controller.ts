import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './habits.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listHabits = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listHabits(userId(req)) }));
export const createHabit = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createHabit(userId(req), req.body) }));
export const updateHabit = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateHabit(userId(req), req.params.id, req.body) }));
export const deleteHabit = asyncHandler(async (req, res) => {
  await service.deleteHabit(userId(req), req.params.id);
  res.status(204).send();
});
export const logHabit = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.logHabit(userId(req), req.params.id, req.body) }));
export const deleteHabitLog = asyncHandler(async (req, res) => {
  await service.deleteHabitLog(userId(req), req.params.id, req.params.date);
  res.status(204).send();
});
export const habitStats = asyncHandler(async (req, res) => res.json({ success: true, data: await service.habitStats(userId(req), req.params.id) }));

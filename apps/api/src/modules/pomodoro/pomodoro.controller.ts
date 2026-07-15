import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './pomodoro.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listSessions = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listSessions(userId(req)) }));
export const createSession = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createSession(userId(req), req.body) }));
export const updateSession = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateSession(userId(req), req.params.id, req.body) }));
export const deleteSession = asyncHandler(async (req, res) => {
  await service.deleteSession(userId(req), req.params.id);
  res.status(204).send();
});
export const dailyStats = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  res.json({ success: true, data: await service.stats(userId(req), since) });
});
export const weeklyStats = asyncHandler(async (req, res) => {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  res.json({ success: true, data: await service.stats(userId(req), since) });
});

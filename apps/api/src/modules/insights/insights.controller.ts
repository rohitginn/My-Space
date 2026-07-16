import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './insights.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const getInsights = asyncHandler(async (req, res) => {
  const parsed = Number(req.query.days);
  const days = Number.isFinite(parsed) && req.query.days !== undefined ? Math.min(30, Math.max(7, Math.round(parsed))) : 14;
  res.json({ success: true, data: await service.getInsights(userId(req), days) });
});

import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './notifications.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listNotifications = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.listNotifications(userId(req), {
    cursor: typeof req.query.cursor === 'string' ? req.query.cursor : undefined,
    unreadOnly: req.query.unreadOnly === 'true',
  }) });
});

export const markRead = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.markNotificationRead(userId(req), req.params.id) });
});

export const markAllRead = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await service.markAllNotificationsRead(userId(req)) });
});

import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as usersService from './users.service.js';

export const getMe = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  res.json({ success: true, data: await usersService.getMe(req.user.id) });
});

export const updateMe = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  res.json({ success: true, data: await usersService.updateMe(req.user.id, req.body) });
});

export const deleteMe = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  await usersService.deleteMe(req.user.id);
  res.status(204).send();
});

export const uploadAvatar = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  if (!req.file) throw new AppError('Avatar file is required', 400, 'FILE_REQUIRED');
  const avatarUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, data: await usersService.updateMe(req.user.id, { avatarUrl }) });
});

export const addXP = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  const amount = Number(req.body.amount);
  if (isNaN(amount) || amount <= 0) throw new AppError('Invalid amount', 400, 'INVALID_AMOUNT');
  res.json({ success: true, data: await usersService.addXP(req.user.id, amount) });
});

export const getMyBadges = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  res.json({ success: true, data: await usersService.getBadges(req.user.id) });
});

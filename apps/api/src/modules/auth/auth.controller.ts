import type { Response } from 'express';

import { env } from '../../config/env.js';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as authService from './auth.service.js';

const refreshCookieName = 'refreshToken';

function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth/refresh',
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(refreshCookieName, { path: '/api/auth/refresh' });
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  setRefreshCookie(res, result.refreshToken);
  res.status(201).json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  setRefreshCookie(res, result.refreshToken);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
});

export const refresh = asyncHandler(async (req, res) => {
  const result = await authService.refresh(req.cookies?.refreshToken);
  setRefreshCookie(res, result.refreshToken);
  res.json({ success: true, data: { user: result.user, accessToken: result.accessToken } });
});

export const logout = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  await authService.logout(req.user.id);
  clearRefreshCookie(res);
  res.json({ success: true, data: { loggedOut: true } });
});

export const me = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  res.json({ success: true, data: { user: req.user } });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  await authService.requestPasswordReset(req.body.email);
  res.json({ success: true, data: { queued: true } });
});

export const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  clearRefreshCookie(res);
  res.json({ success: true, data: { passwordReset: true } });
});

export const changePassword = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  await authService.changePassword(req.user.id, req.body.currentPassword, req.body.nextPassword);
  clearRefreshCookie(res);
  res.json({ success: true, data: { passwordChanged: true } });
});

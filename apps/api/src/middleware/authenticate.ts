import type { NextFunction, Request, Response } from 'express';

import { AppError } from '../utils/AppError.js';
import { verifyAccessToken } from '../utils/jwt.js';

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

  if (!token) {
    next(new AppError('Authentication required', 401, 'AUTH_REQUIRED'));
    return;
  }

  try {
    const payload = verifyAccessToken(token);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch {
    next(new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN'));
  }
}

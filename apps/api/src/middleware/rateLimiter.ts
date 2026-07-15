import rateLimit from 'express-rate-limit';

import { env } from '../config/env.js';

export const rateLimiter = {
  global: rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.NODE_ENV === 'development' ? 10000 : env.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  }),
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: env.NODE_ENV === 'development' ? 1000 : 5,
    standardHeaders: true,
    legacyHeaders: false,
  }),
};

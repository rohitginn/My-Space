import cors from 'cors';

import { env } from '../config/env.js';

export const corsMiddleware = cors({
  origin: env.NODE_ENV === 'development' ? true : env.CORS_ORIGIN,
  credentials: true,
});

import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './search.service.js';

export const search = asyncHandler(async (req, res) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  if (!q) throw new AppError('Search query is required', 400, 'SEARCH_QUERY_REQUIRED');
  res.json({ success: true, data: await service.search(req.user.id, q) });
});

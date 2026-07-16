import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './journal.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listEntries = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listEntries(userId(req)) }));
export const upsertEntry = asyncHandler(async (req, res) => res.json({ success: true, data: await service.upsertEntry(userId(req), req.body) }));
export const updateEntry = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateEntry(userId(req), req.params.id, req.body) }));
export const deleteEntry = asyncHandler(async (req, res) => {
  await service.deleteEntry(userId(req), req.params.id);
  res.status(204).send();
});
export const statsSummary = asyncHandler(async (req, res) => res.json({ success: true, data: await service.statsSummary(userId(req)) }));

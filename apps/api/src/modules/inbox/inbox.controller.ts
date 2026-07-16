import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './inbox.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listItems = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listItems(userId(req)) }));
export const createItem = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createItem(userId(req), req.body) }));
export const updateItem = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateItem(userId(req), req.params.id, req.body) }));
export const deleteItem = asyncHandler(async (req, res) => {
  await service.deleteItem(userId(req), req.params.id);
  res.status(204).send();
});
export const convertItem = asyncHandler(async (req, res) => res.json({ success: true, data: await service.convertItem(userId(req), req.params.id, req.body) }));

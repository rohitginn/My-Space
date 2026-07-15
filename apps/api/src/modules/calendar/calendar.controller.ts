import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './calendar.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listEvents = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listEvents(userId(req), req.query as never) }));
export const createEvent = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createEvent(userId(req), req.body) }));
export const updateEvent = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateEvent(userId(req), req.params.id, req.body) }));
export const deleteEvent = asyncHandler(async (req, res) => {
  await service.deleteEvent(userId(req), req.params.id);
  res.status(204).send();
});

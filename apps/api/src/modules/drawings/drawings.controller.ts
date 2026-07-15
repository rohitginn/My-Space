import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './drawings.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listDrawings = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await service.listDrawings(userId(req))
  });
});

export const getDrawing = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await service.getDrawing(userId(req), req.params.id)
  });
});

export const createDrawing = asyncHandler(async (req, res) => {
  res.status(201).json({
    success: true,
    data: await service.createDrawing(userId(req), req.body)
  });
});

export const updateDrawing = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    data: await service.updateDrawing(userId(req), req.params.id, req.body)
  });
});

export const deleteDrawing = asyncHandler(async (req, res) => {
  await service.deleteDrawing(userId(req), req.params.id);
  res.status(204).send();
});

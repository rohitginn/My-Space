import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as foldersService from './folders.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listFolders = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await foldersService.listFolders(userId(req)) });
});

export const createFolder = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await foldersService.createFolder(userId(req), req.body) });
});

export const updateFolder = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await foldersService.updateFolder(userId(req), req.params.id, req.body) });
});

export const deleteFolder = asyncHandler(async (req, res) => {
  await foldersService.deleteFolder(userId(req), req.params.id);
  res.status(204).send();
});

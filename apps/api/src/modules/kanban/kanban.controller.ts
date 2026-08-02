import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './kanban.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listBoards = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listBoards(userId(req)) }));
export const listWorkspaceBoards = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listWorkspaceBoards(req.params.workspaceId) }));
export const createBoard = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createBoard(userId(req), req.body) }));
export const createWorkspaceBoard = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createWorkspaceBoard(userId(req), req.params.workspaceId, req.body) }));
export const getBoard = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getBoard(userId(req), req.params.id) }));
export const updateBoard = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateBoard(userId(req), req.params.id, req.body) }));
export const deleteBoard = asyncHandler(async (req, res) => {
  await service.deleteBoard(userId(req), req.params.id);
  res.status(204).send();
});
export const createColumn = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createColumn(userId(req), req.params.id, req.body) }));
export const updateColumn = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateColumn(req.params.id, req.body) }));
export const deleteColumn = asyncHandler(async (req, res) => {
  await service.deleteColumn(req.params.id);
  res.status(204).send();
});
export const reorderColumns = asyncHandler(async (req, res) => res.json({ success: true, data: await service.reorderColumns(req.body.items) }));
export const createCard = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createCard(userId(req), req.params.id, req.body) }));
export const updateCard = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateCard(userId(req), req.params.id, req.body) }));
export const deleteCard = asyncHandler(async (req, res) => {
  await service.deleteCard(userId(req), req.params.id);
  res.status(204).send();
});
export const moveCard = asyncHandler(async (req, res) => res.json({ success: true, data: await service.moveCard(userId(req), req.body) }));

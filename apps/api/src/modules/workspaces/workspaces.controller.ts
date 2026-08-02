import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './workspaces.service.js';

const userId = (req: Express.Request) => {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
};

export const listWorkspaces = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listWorkspaces(userId(req)) }));
export const getWorkspace = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getWorkspace(userId(req), req.params.id) }));
export const createWorkspace = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createWorkspace(userId(req), req.body) }));
export const updateWorkspace = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateWorkspace(userId(req), req.params.id, req.body) }));
export const deleteWorkspace = asyncHandler(async (req, res) => { await service.deleteWorkspace(userId(req), req.params.id); res.status(204).send(); });
export const regenerateInvite = asyncHandler(async (req, res) => res.json({ success: true, data: await service.regenerateInvite(userId(req), req.params.id) }));
export const joinWorkspace = asyncHandler(async (req, res) => res.json({ success: true, data: await service.joinWorkspace(userId(req), req.params.inviteCode) }));
export const updateMemberRole = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateMemberRole(userId(req), req.params.id, req.params.userId, req.body.role) }));
export const removeMember = asyncHandler(async (req, res) => { await service.removeMember(userId(req), req.params.id, req.params.userId); res.status(204).send(); });

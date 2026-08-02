import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './co-canvas.service.js';

const userId = (req: Express.Request) => { if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED'); return req.user.id; };
export const listCanvases = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listCanvases(userId(req), req.params.workspaceId) }));
export const getCanvas = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getCanvas(userId(req), req.params.workspaceId, req.params.canvasId) }));
export const createCanvas = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createCanvas(userId(req), req.params.workspaceId, req.body) }));
export const updateCanvas = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateCanvas(userId(req), req.params.workspaceId, req.params.canvasId, req.body) }));
export const deleteCanvas = asyncHandler(async (req, res) => { await service.deleteCanvas(userId(req), req.params.workspaceId, req.params.canvasId); res.status(204).send(); });

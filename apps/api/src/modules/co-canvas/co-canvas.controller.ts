import type { Request, Response } from 'express';
import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as service from './co-canvas.service.js';

export async function listCanvasComments(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, canvasId } = req.params;
    const comments = await service.listCanvasComments(workspaceId, canvasId);
    res.json({ success: true, data: comments });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Could not fetch canvas comments' } });
  }
}

export async function createCanvasComment(req: Request, res: Response): Promise<void> {
  try {
    const { workspaceId, canvasId } = req.params;
    const userId = req.user!.id;
    const comment = await service.createCanvasComment(workspaceId, canvasId, userId, req.body);
    res.status(201).json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Could not create canvas comment' } });
  }
}

export async function toggleResolveComment(req: Request, res: Response): Promise<void> {
  try {
    const { commentId } = req.params;
    const comment = await service.toggleResolveComment(commentId);
    if (!comment) {
      res.status(404).json({ success: false, error: { message: 'Comment not found' } });
      return;
    }
    res.json({ success: true, data: comment });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Could not toggle comment resolution' } });
  }
}

export async function deleteCanvasComment(req: Request, res: Response): Promise<void> {
  try {
    const { commentId } = req.params;
    const comment = await service.deleteCanvasComment(commentId);
    if (!comment) {
      res.status(404).json({ success: false, error: { message: 'Comment not found' } });
      return;
    }
    res.json({ success: true, data: { id: comment.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: { message: 'Could not delete canvas comment' } });
  }
}

const userId = (req: Express.Request) => { if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED'); return req.user.id; };
export const listCanvases = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listCanvases(userId(req), req.params.workspaceId) }));
export const getCanvas = asyncHandler(async (req, res) => res.json({ success: true, data: await service.getCanvas(userId(req), req.params.workspaceId, req.params.canvasId) }));
export const createCanvas = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createCanvas(userId(req), req.params.workspaceId, req.body) }));
export const updateCanvas = asyncHandler(async (req, res) => res.json({ success: true, data: await service.updateCanvas(userId(req), req.params.workspaceId, req.params.canvasId, req.body) }));
export const deleteCanvas = asyncHandler(async (req, res) => { await service.deleteCanvas(userId(req), req.params.workspaceId, req.params.canvasId); res.status(204).send(); });
export const listComments = asyncHandler(async (req, res) => res.json({ success: true, data: await service.listComments(userId(req), req.params.workspaceId, req.params.canvasId) }));
export const createComment = asyncHandler(async (req, res) => res.status(201).json({ success: true, data: await service.createComment(userId(req), req.params.workspaceId, req.params.canvasId, req.body) }));
export const resolveComment = asyncHandler(async (req, res) => res.json({ success: true, data: await service.resolveComment(userId(req), req.params.workspaceId, req.params.canvasId, req.params.commentId, req.body.isResolved) }));

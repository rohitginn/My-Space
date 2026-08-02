import type { Request, Response } from 'express';
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

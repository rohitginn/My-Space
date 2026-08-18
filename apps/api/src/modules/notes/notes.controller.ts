import { AppError } from '../../utils/AppError.js';
import { asyncHandler } from '../../utils/asyncHandler.js';
import * as notesService from './notes.service.js';

function userId(req: Express.Request) {
  if (!req.user) throw new AppError('Authentication required', 401, 'AUTH_REQUIRED');
  return req.user.id;
}

export const listNotes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.listNotes(userId(req), req.query as never) });
});

export const listWorkspaceNotes = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.listWorkspaceNotes(userId(req), req.params.workspaceId) });
});

export const createWorkspaceNote = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await notesService.createWorkspaceNote(userId(req), req.params.workspaceId, req.body) });
});

export const getNote = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.getNote(userId(req), req.params.id) });
});

export const createNote = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, data: await notesService.createNote(userId(req), req.body) });
});

export const updateNote = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.updateNote(userId(req), req.params.id, req.body) });
});

export const trashNote = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.trashNote(userId(req), req.params.id) });
});

export const restoreNote = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.restoreNote(userId(req), req.params.id) });
});

export const hardDeleteNote = asyncHandler(async (req, res) => {
  await notesService.hardDeleteNote(userId(req), req.params.id);
  res.status(204).send();
});

export const togglePin = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await notesService.togglePin(userId(req), req.params.id) });
});

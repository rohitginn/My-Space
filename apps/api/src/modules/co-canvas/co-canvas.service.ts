import { and, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { coCanvases } from '../../db/schema/co-canvases.js';
import { AppError } from '../../utils/AppError.js';
import { getMembership, requireRole } from '../workspaces/workspaces.service.js';

export async function listCanvases(userId: string, workspaceId: string) {
  await getMembership(userId, workspaceId);
  return db.select().from(coCanvases).where(eq(coCanvases.workspaceId, workspaceId)).orderBy(desc(coCanvases.updatedAt));
}
export async function getCanvas(userId: string, workspaceId: string, canvasId: string) {
  await getMembership(userId, workspaceId);
  const canvas = await db.query.coCanvases.findFirst({ where: and(eq(coCanvases.workspaceId, workspaceId), eq(coCanvases.id, canvasId)) });
  if (!canvas) throw new AppError('Co-Canvas not found', 404, 'CO_CANVAS_NOT_FOUND');
  return canvas;
}
export async function createCanvas(userId: string, workspaceId: string, input: { title: string; documentData?: Record<string, unknown> }) {
  await requireRole(userId, workspaceId, ['owner', 'admin', 'member']);
  const [canvas] = await db.insert(coCanvases).values({ workspaceId, createdById: userId, title: input.title, documentData: input.documentData ?? {} }).returning();
  return canvas;
}
export async function updateCanvas(userId: string, workspaceId: string, canvasId: string, input: { title?: string; documentData?: Record<string, unknown> }) {
  await requireRole(userId, workspaceId, ['owner', 'admin', 'member']);
  const [canvas] = await db.update(coCanvases).set({ ...input, updatedAt: new Date() }).where(and(eq(coCanvases.workspaceId, workspaceId), eq(coCanvases.id, canvasId))).returning();
  if (!canvas) throw new AppError('Co-Canvas not found', 404, 'CO_CANVAS_NOT_FOUND');
  return canvas;
}
export async function deleteCanvas(userId: string, workspaceId: string, canvasId: string) {
  await requireRole(userId, workspaceId, ['owner', 'admin']);
  const [canvas] = await db.delete(coCanvases).where(and(eq(coCanvases.workspaceId, workspaceId), eq(coCanvases.id, canvasId))).returning();
  if (!canvas) throw new AppError('Co-Canvas not found', 404, 'CO_CANVAS_NOT_FOUND');
}

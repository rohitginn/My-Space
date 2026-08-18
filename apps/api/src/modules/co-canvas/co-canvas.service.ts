import { and, asc, desc, eq } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { canvasComments, coCanvases } from '../../db/schema/co-canvases.js';
import { users } from '../../db/schema/users.js';
import { AppError } from '../../utils/AppError.js';
import { getMembership, requireRole } from '../workspaces/workspaces.service.js';

export type CreateCommentInput = {
  x: number;
  y: number;
  content: string;
};

export type CommentRecord = {
  id: string;
  canvasId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  avatarUrl: string | null;
  x: number;
  y: number;
  content: string;
  isResolved: boolean;
  createdAt: string;
};

function toCommentRecord(row: {
  id: string;
  canvasId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  x: unknown;
  y: unknown;
  content: string;
  isResolved: Date | null;
  createdAt: Date;
  avatarUrl: string | null;
}): CommentRecord {
  return {
    id: row.id,
    canvasId: row.canvasId,
    workspaceId: row.workspaceId,
    userId: row.userId,
    userName: row.userName,
    avatarUrl: row.avatarUrl,
    x: Number(row.x),
    y: Number(row.y),
    content: row.content,
    isResolved: !!row.isResolved,
    createdAt: row.createdAt.toISOString(),
  };
}

async function getComment(userId: string, workspaceId: string, canvasId: string, commentId: string) {
  await getCanvas(userId, workspaceId, canvasId);
  const [comment] = await db
    .select({
      id: canvasComments.id,
      canvasId: canvasComments.canvasId,
      workspaceId: canvasComments.workspaceId,
      userId: canvasComments.userId,
      userName: canvasComments.userName,
      x: canvasComments.x,
      y: canvasComments.y,
      content: canvasComments.content,
      isResolved: canvasComments.isResolved,
      createdAt: canvasComments.createdAt,
      avatarUrl: users.avatarUrl,
    })
    .from(canvasComments)
    .leftJoin(users, eq(users.id, canvasComments.userId))
    .where(and(eq(canvasComments.workspaceId, workspaceId), eq(canvasComments.canvasId, canvasId), eq(canvasComments.id, commentId)))
    .limit(1);
  if (!comment) throw new AppError('Canvas comment not found', 404, 'CANVAS_COMMENT_NOT_FOUND');
  return toCommentRecord(comment);
}

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

export async function listComments(userId: string, workspaceId: string, canvasId: string) {
  await getCanvas(userId, workspaceId, canvasId);
  const rows = await db
    .select({
      id: canvasComments.id,
      canvasId: canvasComments.canvasId,
      workspaceId: canvasComments.workspaceId,
      userId: canvasComments.userId,
      userName: canvasComments.userName,
      x: canvasComments.x,
      y: canvasComments.y,
      content: canvasComments.content,
      isResolved: canvasComments.isResolved,
      createdAt: canvasComments.createdAt,
      avatarUrl: users.avatarUrl,
    })
    .from(canvasComments)
    .leftJoin(users, eq(users.id, canvasComments.userId))
    .where(and(eq(canvasComments.workspaceId, workspaceId), eq(canvasComments.canvasId, canvasId)))
    .orderBy(asc(canvasComments.createdAt));
  return rows.map(toCommentRecord);
}

export async function createComment(userId: string, workspaceId: string, canvasId: string, input: CreateCommentInput) {
  await requireRole(userId, workspaceId, ['owner', 'admin', 'member']);
  await getCanvas(userId, workspaceId, canvasId);
  const user = await db.query.users.findFirst({ where: eq(users.id, userId), columns: { displayName: true, avatarUrl: true } });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const [created] = await db.insert(canvasComments).values({
    canvasId,
    workspaceId,
    userId,
    userName: user.displayName,
    x: input.x,
    y: input.y,
    content: input.content,
  }).returning();

  return toCommentRecord({ ...created, avatarUrl: user.avatarUrl });
}

export async function resolveComment(userId: string, workspaceId: string, canvasId: string, commentId: string, isResolved: boolean) {
  await requireRole(userId, workspaceId, ['owner', 'admin', 'member']);
  await getCanvas(userId, workspaceId, canvasId);
  const [updated] = await db
    .update(canvasComments)
    .set({ isResolved: isResolved ? new Date() : null })
    .where(and(eq(canvasComments.workspaceId, workspaceId), eq(canvasComments.canvasId, canvasId), eq(canvasComments.id, commentId)))
    .returning({ id: canvasComments.id });
  if (!updated) throw new AppError('Canvas comment not found', 404, 'CANVAS_COMMENT_NOT_FOUND');
  return getComment(userId, workspaceId, canvasId, updated.id);
}

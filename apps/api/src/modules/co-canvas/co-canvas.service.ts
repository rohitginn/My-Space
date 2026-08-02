import { eq, and } from 'drizzle-orm';
import { db } from '../../config/db.js';
import { canvasComments } from '../../db/schema/co-canvases.js';
import { users } from '../../db/schema/users.js';

export async function listCanvasComments(workspaceId: string, canvasId: string) {
  const comments = await db
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
    })
    .from(canvasComments)
    .where(and(eq(canvasComments.workspaceId, workspaceId), eq(canvasComments.canvasId, canvasId)))
    .orderBy(canvasComments.createdAt);

  return comments.map((c: any) => ({
    ...c,
    x: Number(c.x),
    y: Number(c.y),
    isResolved: !!c.isResolved,
  }));
}

export async function createCanvasComment(
  workspaceId: string,
  canvasId: string,
  userId: string,
  input: { x: number; y: number; content: string }
) {
  // Get user displayName
  const userList = await db.select({ displayName: users.displayName }).from(users).where(eq(users.id, userId)).limit(1);
  const userName = userList[0]?.displayName || 'Collaborator';

  const [comment] = await db
    .insert(canvasComments)
    .values({
      workspaceId,
      canvasId,
      userId,
      userName,
      x: input.x as unknown as any,
      y: input.y as unknown as any,
      content: input.content,
    })
    .returning();

  return {
    ...comment,
    x: Number(comment.x),
    y: Number(comment.y),
    isResolved: !!comment.isResolved,
  };
}

export async function toggleResolveComment(commentId: string) {
  const [existing] = await db.select().from(canvasComments).where(eq(canvasComments.id, commentId)).limit(1);
  if (!existing) return null;

  const nextResolved = existing.isResolved ? null : new Date();
  const [updated] = await db
    .update(canvasComments)
    .set({ isResolved: nextResolved })
    .where(eq(canvasComments.id, commentId))
    .returning();

  return {
    ...updated,
    x: Number(updated.x),
    y: Number(updated.y),
    isResolved: !!updated.isResolved,
  };
}

export async function deleteCanvasComment(commentId: string) {
  const [deleted] = await db.delete(canvasComments).where(eq(canvasComments.id, commentId)).returning();
  return deleted || null;
}

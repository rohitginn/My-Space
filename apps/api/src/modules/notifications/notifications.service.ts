import { and, desc, eq, isNull, lt } from 'drizzle-orm';

import { db } from '../../config/db.js';
import { notifications } from '../../db/schema/notifications.js';
import { users } from '../../db/schema/users.js';
import { workspaceMembers } from '../../db/schema/workspaces.js';
import { emitNotification } from '../../sockets/notification.hub.js';

export type CreateNotificationInput = {
  userId: string;
  workspaceId?: string | null;
  actorId?: string | null;
  type: string;
  entityType?: string | null;
  entityId?: string | null;
  payload?: Record<string, unknown>;
};

export async function createNotification(input: CreateNotificationInput) {
  const [created] = await db.insert(notifications).values({
    userId: input.userId,
    workspaceId: input.workspaceId ?? null,
    actorId: input.actorId ?? null,
    type: input.type,
    entityType: input.entityType ?? null,
    entityId: input.entityId ?? null,
    payload: input.payload ?? {},
  }).returning();
  emitNotification(input.userId, created);
  return created;
}

export async function listNotifications(userId: string, options: { cursor?: string; unreadOnly?: boolean; limit?: number }) {
  const filters = [eq(notifications.userId, userId)];
  if (options.unreadOnly) filters.push(isNull(notifications.readAt));
  if (options.cursor) {
    const cursorDate = new Date(options.cursor);
    if (!Number.isNaN(cursorDate.getTime())) filters.push(lt(notifications.createdAt, cursorDate));
  }

  const limit = Math.min(Math.max(options.limit ?? 20, 1), 50);
  const rows = await db.select().from(notifications).where(and(...filters)).orderBy(desc(notifications.createdAt)).limit(limit + 1);
  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit);
  return {
    items,
    nextCursor: hasMore && items.at(-1) ? items.at(-1)!.createdAt.toISOString() : null,
    unreadCount: await db.select({ id: notifications.id }).from(notifications).where(and(eq(notifications.userId, userId), isNull(notifications.readAt))).then((result) => result.length),
  };
}

export async function markNotificationRead(userId: string, id: string) {
  const [updated] = await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.id, id), eq(notifications.userId, userId))).returning();
  return updated ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  const result = await db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.userId, userId), isNull(notifications.readAt)));
  return { updated: result.count };
}

export async function notifyWorkspaceMention(input: { workspaceId: string; actorId: string; content: string; canvasId: string; commentId?: string }) {
  const mentionedTokens = new Set(Array.from(input.content.matchAll(/@([\w.-]+)/g), (match) => match[1].toLowerCase()));
  if (!mentionedTokens.size) return;
  const members = await db.select({ userId: workspaceMembers.userId, displayName: users.displayName })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, input.workspaceId));
  await Promise.all(members
    .filter((member) => member.userId !== input.actorId && mentionedTokens.has(member.displayName.toLowerCase().replace(/\s+/g, '')))
    .map((member) => createNotification({
      userId: member.userId,
      workspaceId: input.workspaceId,
      actorId: input.actorId,
      type: 'canvas_comment_mention',
      entityType: 'canvas',
      entityId: input.canvasId,
      payload: { href: `/co-space/${input.workspaceId}/canvas/${input.canvasId}`, commentId: input.commentId },
    })));
}

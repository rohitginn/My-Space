import type { Server, Socket } from 'socket.io';

import { AppError } from '../utils/AppError.js';
import { notifyWorkspaceMention } from '../modules/notifications/notifications.service.js';
import {
  applyResourceUpdate,
  authorizeResource,
  getResourceKey,
  joinResource,
  leaveResource,
  type CollaborationResource,
  type CollaborationResourceType,
} from '../modules/collaboration/collaboration.service.js';

type ResourcePayload = {
  workspaceId: string;
  resourceId: string;
  resourceType: CollaborationResourceType;
};

type JoinAck =
  | { ok: true; revision: number }
  | { ok: false; code: 'WORKSPACE_ACCESS_DENIED' | 'RESOURCE_NOT_FOUND' };

function isResourcePayload(value: unknown): value is ResourcePayload {
  if (!value || typeof value !== 'object') return false;
  const payload = value as Partial<ResourcePayload>;
  return typeof payload.workspaceId === 'string'
    && typeof payload.resourceId === 'string'
    && (payload.resourceType === 'canvas' || payload.resourceType === 'note');
}

function roomFor(resource: CollaborationResource) {
  return `collab:${resource.resourceType}:${resource.workspaceId}:${resource.resourceId}`;
}

const presenceByRoom = new Map<string, Map<string, { socketId: string; userId: string; userName: string; userColor: string }>>();

function publishPresence(io: Server, room: string) {
  const users = Array.from(presenceByRoom.get(room)?.values() ?? []);
  io.to(room).emit('collab:presence', users);
  if (!users.length) presenceByRoom.delete(room);
}

function errorCode(error: unknown): 'WORKSPACE_ACCESS_DENIED' | 'RESOURCE_NOT_FOUND' {
  if (error instanceof AppError && (error.code === 'WORKSPACE_ACCESS_DENIED' || error.code.endsWith('_NOT_FOUND'))) {
    return error.code === 'WORKSPACE_ACCESS_DENIED' ? 'WORKSPACE_ACCESS_DENIED' : 'RESOURCE_NOT_FOUND';
  }
  return 'RESOURCE_NOT_FOUND';
}

export function registerCollaborationSocket(io: Server, socket: Socket) {
  const joined = new Map<string, CollaborationResource>();

  socket.on('collab:join', async (payload: unknown, ack?: (result: JoinAck) => void) => {
    if (!isResourcePayload(payload)) {
      ack?.({ ok: false, code: 'RESOURCE_NOT_FOUND' });
      return;
    }

    const resource = payload satisfies CollaborationResource;
    try {
      const state = await joinResource(socket.data.userId, resource);
      const room = roomFor(resource);
      socket.join(room);
      joined.set(getResourceKey(resource), resource);
      const presence = presenceByRoom.get(room) ?? new Map();
      presence.set(socket.id, { socketId: socket.id, userId: socket.data.userId, userName: socket.data.displayName ?? 'Collaborator', userColor: socket.data.userColor ?? '#3b82f6' });
      presenceByRoom.set(room, presence);
      publishPresence(io, room);
      socket.emit('collab:sync', { ...resource, update: state.state, revision: state.revision });
      ack?.({ ok: true, revision: state.revision });
    } catch (error) {
      ack?.({ ok: false, code: errorCode(error) });
    }
  });

  socket.on('collab:update', async (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const input = payload as ResourcePayload & { update?: unknown };
    if (!isResourcePayload(input) || typeof input.update !== 'string') return;

    const resource: CollaborationResource = {
      workspaceId: input.workspaceId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    };
    const key = getResourceKey(resource);
    if (!joined.has(key)) return;

    try {
      const result = await applyResourceUpdate(socket.data.userId, resource, input.update);
      socket.to(roomFor(resource)).emit('collab:update', {
        ...resource,
        update: input.update,
        revision: result.revision,
        updatedBy: socket.data.userId,
      });
    } catch {
      socket.emit('collab:error', { ...resource, code: 'COLLABORATION_UPDATE_REJECTED' });
    }
  });

  socket.on('collab:awareness', (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const input = payload as ResourcePayload & { state?: unknown };
    if (!isResourcePayload(input)) return;
    const resource: CollaborationResource = {
      workspaceId: input.workspaceId,
      resourceId: input.resourceId,
      resourceType: input.resourceType,
    };
    if (!joined.has(getResourceKey(resource))) return;

    socket.to(roomFor(resource)).emit('collab:awareness', {
      ...resource,
      state: input.state ?? null,
      userId: socket.data.userId,
      displayName: socket.data.displayName ?? 'Collaborator',
      color: socket.data.userColor ?? '#3b82f6',
    });
  });

  socket.on('collab:comment', async (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const input = payload as ResourcePayload & { comment?: Record<string, unknown> };
    if (!isResourcePayload(input) || !input.comment || !joined.has(getResourceKey(input))) return;
    const resource: CollaborationResource = { workspaceId: input.workspaceId, resourceId: input.resourceId, resourceType: input.resourceType };
    try {
      await authorizeResource(socket.data.userId, resource, true);
      io.to(roomFor(resource)).emit('collab:comment', {
        ...input.comment,
        userId: socket.data.userId,
        userName: socket.data.displayName ?? 'Collaborator',
      });
      if (resource.resourceType === 'canvas' && typeof input.comment.content === 'string') {
        void notifyWorkspaceMention({ workspaceId: resource.workspaceId, actorId: socket.data.userId, content: input.comment.content, canvasId: resource.resourceId, commentId: typeof input.comment.id === 'string' ? input.comment.id : undefined });
      }
    } catch {
      socket.emit('collab:error', { ...resource, code: 'COLLABORATION_COMMENT_REJECTED' });
    }
  });

  socket.on('collab:comment-resolve', async (payload: unknown) => {
    if (!payload || typeof payload !== 'object') return;
    const input = payload as ResourcePayload & { commentId?: string };
    if (!isResourcePayload(input) || typeof input.commentId !== 'string' || !joined.has(getResourceKey(input))) return;
    const resource: CollaborationResource = { workspaceId: input.workspaceId, resourceId: input.resourceId, resourceType: input.resourceType };
    try {
      await authorizeForEvent(socket.data.userId, resource);
      io.to(roomFor(resource)).emit('collab:comment-resolve', { ...resource, commentId: input.commentId, userId: socket.data.userId });
    } catch {
      socket.emit('collab:error', { ...resource, code: 'COLLABORATION_COMMENT_REJECTED' });
    }
  });

  socket.on('collab:leave', (payload: unknown) => {
    if (!isResourcePayload(payload)) return;
    const resource = payload satisfies CollaborationResource;
    const key = getResourceKey(resource);
    if (!joined.delete(key)) return;
    const room = roomFor(resource);
    socket.leave(room);
    presenceByRoom.get(room)?.delete(socket.id);
    publishPresence(io, room);
    void leaveResource(resource);
  });

  socket.on('disconnecting', () => {
    for (const resource of joined.values()) {
      const room = roomFor(resource);
      presenceByRoom.get(room)?.delete(socket.id);
      publishPresence(io, room);
      void leaveResource(resource);
    }
    joined.clear();
  });
}

async function authorizeForEvent(userId: string, resource: CollaborationResource) {
  return authorizeResource(userId, resource, true);
}

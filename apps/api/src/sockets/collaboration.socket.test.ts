import type { Server, Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  joinResource: vi.fn(),
  applyResourceUpdate: vi.fn(),
  leaveResource: vi.fn(),
  authorizeResource: vi.fn(),
}));

vi.mock('../modules/collaboration/collaboration.service.js', () => ({
  joinResource: mocks.joinResource,
  applyResourceUpdate: mocks.applyResourceUpdate,
  leaveResource: mocks.leaveResource,
  authorizeResource: mocks.authorizeResource,
  getResourceKey: (resource: { workspaceId: string; resourceType: string; resourceId: string }) => `${resource.resourceType}:${resource.workspaceId}:${resource.resourceId}`,
}));

import { registerCollaborationSocket } from './collaboration.socket.js';
import { AppError } from '../utils/AppError.js';

function makeSocket() {
  const handlers = new Map<string, (...args: any[]) => unknown>();
  const roomEmit = vi.fn();
  const socket = {
    id: 'socket-1',
    data: { userId: 'user-1', displayName: 'Authenticated User', userColor: '#0f766e' },
    rooms: new Set<string>(),
    on: (event: string, handler: (...args: any[]) => unknown) => handlers.set(event, handler),
    join: vi.fn((room: string) => socket.rooms.add(room)),
    leave: vi.fn((room: string) => socket.rooms.delete(room)),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: roomEmit })),
  } as unknown as Socket;
  return { socket, roomEmit, trigger: async (event: string, ...args: any[]) => await handlers.get(event)?.(...args) };
}

describe('collaboration socket authorization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.joinResource.mockResolvedValue({ state: 'AQ==', revision: 0, key: 'canvas:workspace-1:canvas-1' });
    mocks.applyResourceUpdate.mockResolvedValue({ revision: 1 });
    mocks.authorizeResource.mockResolvedValue({ role: 'member' });
  });

  it('rejects an unauthorized room join with the public ack contract', async () => {
    mocks.joinResource.mockRejectedValue(new AppError('Workspace access denied', 403, 'WORKSPACE_ACCESS_DENIED'));
    const client = makeSocket();
    registerCollaborationSocket({ to: vi.fn(() => ({ emit: vi.fn() })) } as unknown as Server, client.socket);
    const ack = vi.fn();

    await client.trigger('collab:join', { workspaceId: 'workspace-1', resourceType: 'canvas', resourceId: 'canvas-1' }, ack);

    expect(ack).toHaveBeenCalledWith({ ok: false, code: 'WORKSPACE_ACCESS_DENIED' });
    expect(client.socket.join).not.toHaveBeenCalled();
  });

  it('ignores updates before join and derives awareness identity from the socket', async () => {
    const client = makeSocket();
    const io = { to: vi.fn(() => ({ emit: vi.fn() })) } as unknown as Server;
    registerCollaborationSocket(io, client.socket);
    const resource = { workspaceId: 'workspace-1', resourceType: 'canvas', resourceId: 'canvas-1' as const };

    await client.trigger('collab:update', { ...resource, update: 'AQ==' });
    expect(mocks.applyResourceUpdate).not.toHaveBeenCalled();

    await client.trigger('collab:join', resource, vi.fn());
    await client.trigger('collab:update', { ...resource, update: 'AQ==' });
    await client.trigger('collab:awareness', { ...resource, state: { x: 10, y: 20 }, displayName: 'spoofed' });

    expect(mocks.applyResourceUpdate).toHaveBeenCalledWith('user-1', resource, 'AQ==');
    expect(client.socket.to).toHaveBeenCalledWith('collab:canvas:workspace-1:canvas-1');
    expect(client.socket.emit).not.toHaveBeenCalledWith('collab:awareness', expect.objectContaining({ displayName: 'spoofed' }));
  });
});

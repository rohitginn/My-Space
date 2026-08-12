import type { Server, Socket } from 'socket.io';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { registerCoCanvasSocket } from './co-canvas.socket.js';

function makeSocket(id: string) {
  const handlers = new Map<string, (...args: unknown[]) => void>();
  const socket = {
    id,
    data: { userId: `user-${id}` },
    rooms: new Set<string>(),
    on: (event: string, handler: (...args: unknown[]) => void) => handlers.set(event, handler),
    join: (room: string) => socket.rooms.add(room),
    leave: (room: string) => socket.rooms.delete(room),
    emit: vi.fn(),
    to: vi.fn(() => ({ emit: vi.fn() })),
  } as unknown as Socket;

  return {
    socket,
    trigger: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
  };
}

describe('co-canvas socket lifecycle', () => {
  let io: Server;

  beforeEach(() => {
    io = {
      to: vi.fn(() => ({ emit: vi.fn() })),
    } as unknown as Server;
  });

  it('ignores updates from sockets that have not joined a room', () => {
    const first = makeSocket('first');
    registerCoCanvasSocket(io, first.socket);

    first.trigger('co-canvas:update', {
      workspaceId: 'workspace-1',
      canvasId: 'canvas-1',
      documentData: { shapes: { leaked: true } },
    });

    first.trigger('co-canvas:join', { workspaceId: 'workspace-1', canvasId: 'canvas-1' });
    expect(first.socket.emit).not.toHaveBeenCalledWith('co-canvas:updated', expect.anything());
  });

  it('removes the in-memory document when the last collaborator leaves', () => {
    const first = makeSocket('first');
    const second = makeSocket('second');
    registerCoCanvasSocket(io, first.socket);
    registerCoCanvasSocket(io, second.socket);

    const room = { workspaceId: 'workspace-1', canvasId: 'canvas-1' };
    first.trigger('co-canvas:join', room);
    first.trigger('co-canvas:update', { ...room, documentData: { shapes: { saved: true } } });
    first.trigger('co-canvas:leave', room);

    second.trigger('co-canvas:join', room);
    expect(second.socket.emit).not.toHaveBeenCalledWith('co-canvas:updated', expect.anything());
  });
});

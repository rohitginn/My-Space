// ============================================================
// Canvas Editor - Uses Custom SVG Infinite Canvas Engine
// ============================================================

'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Loader2, CloudLightning, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { InfiniteCanvas, useCanvasEngine } from '@/lib/canvas';
import type { CanvasDocument } from '@/lib/canvas';

function debounce(func: (data: CanvasDocument) => void, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (data: CanvasDocument) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(data), wait);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced;
}

type DrawingDetail = {
  id: string;
  title: string;
  documentData: unknown;
};

function CanvasEditorInner({ id, drawing, workspaceId }: { id: string; drawing: DrawingDetail; workspaceId?: string }) {
  const router = useRouter();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [activeUsers, setActiveUsers] = useState<{ socketId: string; userId: string; userName: string; userColor: string }[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { userId: string; x: number; y: number; name: string; color: string }>>({});
  const [comments, setComments] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Fetch persistent canvas comments from database
  useQuery({
    queryKey: ['co-canvas-comments', workspaceId, id],
    queryFn: async () => {
      if (!workspaceId) return [];
      const { data } = await api.get(`/workspaces/${workspaceId}/canvases/${id}/comments`);
      const fetched = data.data || [];
      setComments(fetched);
      return fetched;
    },
    enabled: !!workspaceId,
  });

  // Initialize the custom canvas engine with loaded data
  const engine = useCanvasEngine(drawing.documentData as CanvasDocument | undefined);
  const { loadDocument } = engine;

  const saveMutation = useMutation({
    mutationFn: async (documentData: CanvasDocument) => {
      await api.patch(workspaceId ? `/workspaces/${workspaceId}/canvases/${id}` : `/drawings/${id}`, { documentData });
    },
    onSuccess: () => {
      setSaveStatus('saved');
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Debounced save
  const debouncedSave = useMemo(() => debounce((data: CanvasDocument) => {
      setSaveStatus('saving');
      saveMutation.mutate(data);
    }, 2000), [saveMutation]);

  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  useEffect(() => {
    if (!workspaceId) return;
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    let userName = 'Collaborator';
    let userColor = '#3b82f6';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.name) userName = u.name;
      } catch {}
    }

    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', { auth: { token } });
    socket.emit('co-canvas:join', { workspaceId, canvasId: id, userName, userColor });

    // Flush offline queued actions on reconnect
    socket.on('connect', () => {
      try {
        const pendingQueue = sessionStorage.getItem(`offline-canvas-actions-${id}`);
        if (pendingQueue) {
          const actions: any[] = JSON.parse(pendingQueue);
          actions.forEach((act) => socket.emit(act.event, act.data));
          sessionStorage.removeItem(`offline-canvas-actions-${id}`);
        }
      } catch {}
    });

    socket.on('co-canvas:updated', ({ documentData }: { documentData: CanvasDocument }) => loadDocument(documentData));
    socket.on('co-canvas:presence', (users: { socketId: string; userId: string; userName: string; userColor: string }[]) => setActiveUsers(users));
    socket.on('co-canvas:cursor-moved', (cursor: { userId: string; x: number; y: number; name: string; color: string }) => {
      setRemoteCursors((prev) => ({ ...prev, [cursor.userId]: cursor }));
    });
    socket.on('co-canvas:comment-added', (comment: any) => {
      setComments((prev) => {
        if (prev.some((c) => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    });
    socket.on('co-canvas:comment-resolved-toggled', ({ commentId }: { commentId: string }) => {
      setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, isResolved: !c.isResolved } : c)));
    });

    socketRef.current = socket;
    return () => {
      socket.off('connect');
      socket.off('co-canvas:updated');
      socket.off('co-canvas:presence');
      socket.off('co-canvas:cursor-moved');
      socket.off('co-canvas:comment-added');
      socket.off('co-canvas:comment-resolved-toggled');
      socket.emit('co-canvas:leave', { workspaceId, canvasId: id });
      socket.disconnect();
      socketRef.current = null;
    };
  }, [id, loadDocument, workspaceId]);

  // Callback when canvas content changes
  const handleChanged = useCallback(() => {
    const doc = engine.getDocument();
    debouncedSave(doc);
    if (workspaceId) socketRef.current?.emit('co-canvas:update', { workspaceId, canvasId: id, documentData: doc });
  }, [engine, debouncedSave, id, workspaceId]);

  const handlePointerMoveWorld = useCallback(({ x, y }: { x: number; y: number }) => {
    if (!workspaceId || !socketRef.current) return;
    const userStr = localStorage.getItem('user');
    let name = 'Collaborator';
    if (userStr) {
      try {
        const u = JSON.parse(userStr);
        if (u.name) name = u.name;
      } catch {}
    }
    socketRef.current.emit('co-canvas:cursor', {
      workspaceId,
      canvasId: id,
      x,
      y,
      name,
      color: '#3b82f6',
    });
  }, [workspaceId, id]);

  const handleAddComment = useCallback(async (pt: { x: number; y: number }, content: string) => {
    if (!workspaceId) return;
    try {
      const { data } = await api.post(`/workspaces/${workspaceId}/canvases/${id}/comments`, {
        x: pt.x,
        y: pt.y,
        content,
      });
      const newComment = data.data;
      setComments((prev) => [...prev, newComment]);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('co-canvas:comment-add', { workspaceId, canvasId: id, comment: newComment });
      } else {
        // Queue offline
        const pendingQueue = JSON.parse(sessionStorage.getItem(`offline-canvas-actions-${id}`) || '[]');
        pendingQueue.push({ event: 'co-canvas:comment-add', data: { workspaceId, canvasId: id, comment: newComment } });
        sessionStorage.setItem(`offline-canvas-actions-${id}`, JSON.stringify(pendingQueue));
      }
    } catch (e) {
      console.error('Failed to create comment', e);
    }
  }, [workspaceId, id]);

  const handleToggleResolveComment = useCallback(async (commentId: string) => {
    setComments((prev) => prev.map((c) => (c.id === commentId ? { ...c, isResolved: !c.isResolved } : c)));
    try {
      await api.patch(`/comments/${commentId}/toggle-resolve`);
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('co-canvas:comment-toggle-resolve', { workspaceId, canvasId: id, commentId });
      }
    } catch (e) {
      console.error('Failed to toggle comment resolution', e);
    }
  }, [workspaceId, id]);

  return (
    <div className="w-full h-screen flex flex-col relative bg-background overflow-hidden">
      {/* Top Navbar */}
      <motion.header
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="h-12 border-b border-border bg-surface/85 backdrop-blur flex items-center justify-between px-4 z-20 shrink-0"
      >
        <div className="flex items-center gap-3">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => router.push(workspaceId ? `/co-space/${workspaceId}/canvas` : '/canvas')}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft size={20} />
          </motion.button>

          <h2 className="text-foreground font-semibold text-sm truncate max-w-[200px] md:max-w-sm">
            {drawing.title}{workspaceId && <span className="ml-2 text-xs font-medium text-accent-green">Shared</span>}
          </h2>
        </div>

        {/* Presence Avatars & Save Status */}
        <div className="flex items-center gap-3 text-xs font-medium">
          {workspaceId && activeUsers.length > 0 && (
            <div className="flex items-center -space-x-1.5 mr-2">
              {activeUsers.map((u) => (
                <div
                  key={u.socketId}
                  title={u.userName}
                  className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-background uppercase"
                  style={{ backgroundColor: u.userColor }}
                >
                  {u.userName.charAt(0)}
                </div>
              ))}
            </div>
          )}

          {saveStatus === 'saving' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-full"
            >
              <Loader2 size={12} className="animate-spin" />
              <span>Saving...</span>
            </motion.div>
          )}
          {saveStatus === 'saved' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-accent-green bg-accent-green/10 px-2.5 py-1 rounded-full"
            >
              <Check size={12} />
              <span>Saved</span>
            </motion.div>
          )}
          {saveStatus === 'error' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full"
            >
              <CloudLightning size={12} />
              <span>Error</span>
            </motion.div>
          )}
        </div>
      </motion.header>

      {/* Canvas Workspace */}
      <div className="flex-1 w-full relative z-10">
        <InfiniteCanvas
          engine={engine}
          onChanged={handleChanged}
          onPointerMoveWorld={handlePointerMoveWorld}
          remoteCursors={remoteCursors}
          comments={comments}
          onAddComment={handleAddComment}
          onToggleResolveComment={handleToggleResolveComment}
        />
      </div>
    </div>
  );
}

export default function CanvasEditor({ id, workspaceId }: { id: string; workspaceId?: string }) {
  const router = useRouter();

  const { data: drawing, isLoading, isError } = useQuery({
    queryKey: [workspaceId ? 'co-canvases' : 'drawings', id],
    queryFn: async () => {
      const { data } = await api.get(workspaceId ? `/workspaces/${workspaceId}/canvases/${id}` : `/drawings/${id}`);
      return data.data as DrawingDetail;
    },
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen text-muted bg-background">
        <Loader2 className="animate-spin mb-4 text-accent-blue" size={32} />
        <p className="text-sm font-medium">Opening drawing board...</p>
      </div>
    );
  }

  if (isError || !drawing) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-screen text-red-500 bg-background p-6">
        <AlertCircle size={36} className="mb-4" />
        <h3 className="text-lg font-bold mb-2">Error Opening Board</h3>
        <p className="text-sm text-muted mb-6">Could not load drawing data. Please try again.</p>
        <button
          onClick={() => router.push(workspaceId ? `/co-space/${workspaceId}/canvas` : '/canvas')}
          className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-lg transition-colors font-medium"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  return <CanvasEditorInner id={id} drawing={drawing} workspaceId={workspaceId} />;
}

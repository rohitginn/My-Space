// ============================================================
// Canvas Editor - Uses Custom SVG Infinite Canvas Engine
// ============================================================

'use client';

import { useEffect, useRef, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ChevronLeft, Loader2, CloudLightning, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import * as Y from 'yjs';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { useAuth } from './AuthProvider';
import { InfiniteCanvas, useCanvasEngine } from '@/lib/canvas';
import type { CanvasDocument, CommentPin, RoomUser } from '@/lib/canvas';
import { clearLocalDocumentUpdate, enqueueLocalDocumentUpdate, loadLocalDocument, saveLocalDocument, takeLocalDocumentUpdate } from '@/lib/canvas';
import { applyCanvasSnapshot, readCanvasSnapshot } from '@/lib/collaboration/canvasYjs';

function debounce(func: (data: CanvasDocument) => void, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  let pendingData: CanvasDocument | null = null;
  const debounced = (data: CanvasDocument) => {
    if (timeout) clearTimeout(timeout);
    pendingData = data;
    timeout = setTimeout(() => {
      timeout = null;
      const nextData = pendingData;
      pendingData = null;
      if (nextData) func(nextData);
    }, wait);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    pendingData = null;
  };
  debounced.flush = () => {
    if (timeout) clearTimeout(timeout);
    timeout = null;
    const nextData = pendingData;
    pendingData = null;
    if (nextData) func(nextData);
  };
  return debounced;
}

type DrawingDetail = {
  id: string;
  title: string;
  documentData: unknown;
};

function encodeYjsUpdate(update: Uint8Array) {
  let binary = '';
  update.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
}

function decodeYjsUpdate(update: string) {
  const binary = atob(update);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function mergeComments(current: CommentPin[], incoming: CommentPin[]) {
  const byId = new Map(current.map((comment) => [comment.id, comment]));
  incoming.forEach((comment) => byId.set(comment.id, comment));
  return Array.from(byId.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

function commentsFromDocument(documentData: unknown): CommentPin[] {
  if (!documentData || typeof documentData !== 'object') return [];
  const comments = (documentData as { comments?: unknown }).comments;
  return Array.isArray(comments) ? comments as CommentPin[] : [];
}

function CanvasEditorInner({ id, drawing, workspaceId }: { id: string; drawing: DrawingDetail; workspaceId?: string }) {
  const router = useRouter();
  const { user } = useAuth();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [activeUsers, setActiveUsers] = useState<RoomUser[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<Record<string, { userId: string; x: number; y: number; name: string; color: string }>>({});
  const [comments, setComments] = useState<CommentPin[]>(() => workspaceId ? [] : commentsFromDocument(drawing.documentData));
  const socketRef = useRef<Socket | null>(null);
  const lastCursorEmitAtRef = useRef(0);
  const pendingLocalDocumentRef = useRef(false);
  const latestLocalDocumentRef = useRef<CanvasDocument | null>(null);
  const latestRemoteRevisionRef = useRef(0);
  const ydocRef = useRef<Y.Doc | null>(null);
  const applyingRemoteRef = useRef(false);
  const collabJoinedRef = useRef(false);
  const localPersistenceKey = `canvas:${id}`;

  // Fetch persistent canvas comments from database
  const commentsQuery = useQuery({
    queryKey: ['co-canvas-comments', workspaceId, id],
    queryFn: async () => {
      if (!workspaceId) return [] as CommentPin[];
      const { data } = await api.get(`/workspaces/${workspaceId}/canvases/${id}/comments`);
      return (data.data || []) as CommentPin[];
    },
    enabled: !!workspaceId,
  });
  const visibleComments = workspaceId ? mergeComments(commentsQuery.data ?? [], comments) : comments;
  // Initialize the custom canvas engine with loaded data
  const engine = useCanvasEngine(drawing.documentData as CanvasDocument | undefined);
  const { loadDocument } = engine;

  useEffect(() => {
    const saved = drawing.documentData as CanvasDocument | undefined;
    if (saved && Object.keys(saved.shapes ?? {}).length > 0) return;
    void loadLocalDocument(`canvas:${id}`).then((local) => {
      if (local) {
        loadDocument(local);
        if (!workspaceId) setComments(local.comments ?? []);
      }
    }).catch(() => undefined);
  }, [drawing.documentData, id, loadDocument, workspaceId]);

  const saveMutation = useMutation({
    mutationFn: async (documentData: CanvasDocument) => {
      await api.patch(workspaceId ? `/workspaces/${workspaceId}/canvases/${id}` : `/drawings/${id}`, { documentData });
    },
    onSuccess: (_data, savedDocument) => {
      setSaveStatus('saved');
      if (latestLocalDocumentRef.current === savedDocument) {
        pendingLocalDocumentRef.current = false;
        void clearLocalDocumentUpdate(localPersistenceKey).catch(() => undefined);
      }
    },
    onError: () => {
      setSaveStatus('error');
    },
  });
  const saveDocument = saveMutation.mutate;

  useEffect(() => {
    // Collaborative documents are replayed by the socket connect handler so
    // the update is broadcast after the room join has been accepted.
    if (workspaceId) return;
    void takeLocalDocumentUpdate(localPersistenceKey).then((queued) => {
      if (!queued) return;
      pendingLocalDocumentRef.current = true;
      latestLocalDocumentRef.current = queued;
      loadDocument(queued);
      saveDocument(queued);
    }).catch(() => undefined);
  }, [loadDocument, localPersistenceKey, saveDocument, workspaceId]);

  // Debounced save
  const debouncedSave = useMemo(() => debounce((data: CanvasDocument) => {
      setSaveStatus('saving');
      latestLocalDocumentRef.current = data;
      saveDocument(data);
    }, 2000), [saveDocument]);

  useEffect(() => {
    return () => {
      debouncedSave.flush();
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  useEffect(() => {
    if (!workspaceId) return;
    const token = localStorage.getItem('accessToken');
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', { auth: { token } });
    const handleYUpdate = (update: Uint8Array, origin: unknown) => {
      if (origin === 'remote' || origin === 'sync') return;
      if (socket.connected && collabJoinedRef.current) {
        socket.emit('collab:update', { workspaceId, resourceType: 'canvas', resourceId: id, update: encodeYjsUpdate(update) });
        setSaveStatus('saving');
      }
    };
    ydoc.on('update', handleYUpdate);

    socket.on('collab:sync', ({ update, revision = 0 }: { update: string; revision?: number }) => {
      if (typeof update !== 'string') return;
      latestRemoteRevisionRef.current = revision;
      Y.applyUpdate(ydoc, decodeYjsUpdate(update), 'sync');
      applyingRemoteRef.current = true;
      loadDocument(readCanvasSnapshot(ydoc));
      applyingRemoteRef.current = false;
      collabJoinedRef.current = true;
      void takeLocalDocumentUpdate(localPersistenceKey).then((queued) => {
        if (!queued) return;
        applyCanvasSnapshot(ydoc, queued, 'local');
        void clearLocalDocumentUpdate(localPersistenceKey).catch(() => undefined);
      }).catch(() => undefined);
      setSaveStatus('saved');
    });
    socket.on('collab:update', ({ update, revision = 0 }: { update: string; revision?: number }) => {
      if (typeof update !== 'string' || revision < latestRemoteRevisionRef.current) return;
      latestRemoteRevisionRef.current = revision;
      Y.applyUpdate(ydoc, decodeYjsUpdate(update), 'remote');
      applyingRemoteRef.current = true;
      loadDocument(readCanvasSnapshot(ydoc));
      applyingRemoteRef.current = false;
      setSaveStatus('saved');
    });
    socket.on('collab:awareness', (cursor: { userId: string; state?: { x?: number; y?: number }; displayName?: string; color?: string }) => {
      if (cursor.state && typeof cursor.state.x === 'number' && typeof cursor.state.y === 'number') {
        setRemoteCursors((prev) => ({ ...prev, [cursor.userId]: { userId: cursor.userId, x: cursor.state!.x!, y: cursor.state!.y!, name: cursor.displayName ?? 'Collaborator', color: cursor.color ?? '#3b82f6' } }));
      }
    });
    socket.on('collab:presence', (users: RoomUser[]) => setActiveUsers(users));
    socket.on('collab:comment', (comment: CommentPin) => {
      setComments((prev) => {
        const existing = prev.findIndex((current) => current.id === comment.id);
        if (existing === -1) return [...prev, comment].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
        return prev.map((current, index) => index === existing ? { ...current, ...comment } : current);
      });
    });
    socket.on('collab:comment-resolve', (comment: CommentPin) => {
      setComments((prev) => prev.map((current) => current.id === comment.id ? { ...current, ...comment } : current));
    });

    const join = () => socket.emit('collab:join', { workspaceId, resourceType: 'canvas', resourceId: id });
    socket.on('connect', join);
    if (socket.connected) join();

    socketRef.current = socket;
    return () => {
      socket.off('connect', join);
      socket.off('collab:sync');
      socket.off('collab:update');
      socket.off('collab:awareness');
      socket.off('collab:presence');
      socket.off('collab:comment');
      socket.off('collab:comment-resolve');
      socket.emit('collab:leave', { workspaceId, resourceType: 'canvas', resourceId: id });
      socket.disconnect();
      ydoc.off('update', handleYUpdate);
      ydoc.destroy();
      ydocRef.current = null;
      collabJoinedRef.current = false;
      socketRef.current = null;
      lastCursorEmitAtRef.current = 0;
      setRemoteCursors({});
    };
  }, [id, loadDocument, localPersistenceKey, workspaceId]);

  // Callback when canvas content changes
  const handleChanged = useCallback(() => {
    const doc = engine.getDocument();
    pendingLocalDocumentRef.current = true;
    latestLocalDocumentRef.current = doc;
    if (!workspaceId) debouncedSave(doc);
    void saveLocalDocument(localPersistenceKey, doc).catch(() => undefined);
    void enqueueLocalDocumentUpdate(localPersistenceKey, doc).catch(() => undefined);
    if (workspaceId && !applyingRemoteRef.current && ydocRef.current) {
      applyCanvasSnapshot(ydocRef.current, doc, 'local');
    }
  }, [engine, debouncedSave, id, localPersistenceKey, workspaceId]);

  const handlePointerMoveWorld = useCallback(({ x, y }: { x: number; y: number }) => {
    if (!workspaceId || !socketRef.current) return;
    const now = performance.now();
    if (now - lastCursorEmitAtRef.current < 33) return;
    lastCursorEmitAtRef.current = now;
    socketRef.current.emit('collab:awareness', {
      workspaceId,
      resourceType: 'canvas',
      resourceId: id,
      state: { x, y },
    });
  }, [workspaceId, id]);

  const handleAddComment = useCallback((pt: { x: number; y: number }, content: string) => {
    if (workspaceId) {
      socketRef.current?.emit('collab:comment', { workspaceId, resourceType: 'canvas', resourceId: id, comment: { x: pt.x, y: pt.y, content } });
      return;
    }

    const newComment: CommentPin = {
      id: crypto.randomUUID(),
      canvasId: id,
      userId: user?.id ?? 'me',
      userName: user?.displayName ?? 'You',
      avatarUrl: user?.avatarUrl ?? null,
      x: pt.x,
      y: pt.y,
      content,
      isResolved: false,
      createdAt: new Date().toISOString(),
    };
    const nextComments = [...comments, newComment];
    engine.setComments(nextComments);
    setComments(nextComments);
    handleChanged();
  }, [comments, engine, handleChanged, id, user, workspaceId]);

  const handleToggleResolveComment = useCallback((commentId: string) => {
    const comment = visibleComments.find((current) => current.id === commentId);
    if (!comment) return;
    if (!workspaceId) {
      const nextComments = comments.map((current) => current.id === commentId ? { ...current, isResolved: !current.isResolved } : current);
      engine.setComments(nextComments);
      setComments(nextComments);
      handleChanged();
      return;
    }
    socketRef.current?.emit('collab:comment-resolve', { workspaceId, resourceType: 'canvas', resourceId: id, commentId, isResolved: !comment.isResolved });
  }, [comments, engine, handleChanged, id, visibleComments, workspaceId]);

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
          comments={visibleComments}
          commentAuthor={{ name: user?.displayName ?? 'You', avatarUrl: user?.avatarUrl ?? null }}
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

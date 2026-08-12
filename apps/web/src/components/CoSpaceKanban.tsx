'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Plus, Layout, Loader2, Trash2, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import api from '@/lib/api';
import { Modal } from './Modal';
import { CoSpaceContext } from './CoSpaceContext';
import { useDialog } from './DialogProvider';

type Card = {
  id: string;
  columnId: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  sortOrder: number;
};

type Column = {
  id: string;
  title: string;
  color: string | null;
  cards: Card[];
};

type Board = {
  id: string;
  title: string;
  description: string | null;
  columns?: Column[];
};

export function CoSpaceKanban({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCardTitle, setNewCardTitle] = useState('');
  const [activeColId, setActiveColId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspace boards
  const { data: boards = [], isLoading: boardsLoading, isError: boardsError, refetch: refetchBoards } = useQuery({
    queryKey: ['workspace-boards', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/kanban/workspaces/${workspaceId}/boards`);
      return data.data as Board[];
    },
  });

  const activeBoardId = selectedBoardId && boards.some((board) => board.id === selectedBoardId)
    ? selectedBoardId
    : boards[0]?.id ?? null;

  // Fetch selected board details
  const { data: boardDetail, isLoading: boardLoading, isError: boardError, refetch: refetchBoard } = useQuery({
    queryKey: ['kanban-board', activeBoardId],
    queryFn: async () => {
      if (!activeBoardId) return null;
      const { data } = await api.get(`/kanban/boards/${activeBoardId}`);
      return data.data as Board;
    },
    enabled: !!activeBoardId,
  });

  // Socket sync for selected board
  useEffect(() => {
    if (!activeBoardId) return;
    const token = localStorage.getItem('accessToken');
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', { auth: { token } });
    socket.emit('kanban:board:join', activeBoardId);

    socket.on('kanban:card:moved', () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', activeBoardId] });
    });

    return () => {
      socket.off('kanban:card:moved');
      socket.disconnect();
    };
  }, [activeBoardId, queryClient]);

  // Create board mutation
  const createBoard = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/kanban/workspaces/${workspaceId}/boards`, { title: newTitle, description: newDesc });
      return data.data as Board;
    },
    onSuccess: (newBoard) => {
      queryClient.setQueryData<Board[]>(['workspace-boards', workspaceId], (currentBoards = []) => [
        ...currentBoards.filter((board) => board.id !== newBoard.id),
        newBoard,
      ]);
      queryClient.invalidateQueries({ queryKey: ['workspace-boards', workspaceId] });
      setSelectedBoardId(newBoard.id);
      setShowCreateModal(false);
      setNewTitle('');
      setNewDesc('');
    },
    onError: (requestError) => {
      const response = (requestError as { response?: { data?: { error?: { message?: string } } } }).response;
      setError(response?.data?.error?.message || 'The board could not be created. Check your connection and try again.');
    },
  });

  // Create card mutation
  const createCard = useMutation({
    mutationFn: async ({ columnId, title }: { columnId: string; title: string }) => {
      const { data } = await api.post(`/kanban/columns/${columnId}/cards`, { title });
      return data.data as Card;
    },
    onSuccess: (createdCard) => {
      queryClient.setQueryData<Board>(['kanban-board', activeBoardId], (currentBoard) => {
        if (!currentBoard?.columns) return currentBoard;
        return {
          ...currentBoard,
          columns: currentBoard.columns.map((column) => (
            column.id === createdCard.columnId
              ? { ...column, cards: [...column.cards, createdCard] }
              : column
          )),
        };
      });
      queryClient.invalidateQueries({ queryKey: ['kanban-board', activeBoardId] });
      setActiveColId(null);
      setNewCardTitle('');
    },
    onError: (requestError) => {
      const response = (requestError as { response?: { data?: { error?: { message?: string } } } }).response;
      setError(response?.data?.error?.message || 'The task could not be added. Check your connection and try again.');
    },
  });

  // Delete card mutation
  const deleteCard = useMutation({
    mutationFn: async (cardId: string) => {
      await api.delete(`/kanban/cards/${cardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban-board', activeBoardId] });
    },
    onError: (requestError) => {
      const response = (requestError as { response?: { data?: { error?: { message?: string } } } }).response;
      setError(response?.data?.error?.message || 'The task could not be deleted. Please try again.');
    },
  });

  const removeCard = async (card: Card) => {
    if (await confirm(`Delete “${card.title}”?`, { title: 'Delete task' })) deleteCard.mutate(card.id);
  };

  return (
    <div className="mx-auto min-h-full max-w-7xl px-4 py-8 sm:px-6 md:px-10">
      <CoSpaceContext workspaceId={workspaceId} current="projects" />
      {/* Header */}
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-accent-blue">Workspace Projects</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Project boards</h1>
          <p className="mt-2 max-w-xl text-sm text-muted">Turn shared work into a visible next step for everyone.</p>
        </div>

        <button
          onClick={() => { setError(null); setShowCreateModal(true); }}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:bg-accent-blue-hover shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={17} />
          New Board
        </button>
      </header>

      {/* Board Tabs */}
      {boards.length > 0 && (
        <div role="tablist" aria-label="Project boards" className="mb-6 flex items-center gap-2 overflow-x-auto border-b border-border pb-2">
          {boards.map((b) => (
            <button
              key={b.id}
              onClick={() => setSelectedBoardId(b.id)}
              role="tab"
              aria-selected={activeBoardId === b.id}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                activeBoardId === b.id
                  ? 'bg-accent-blue text-white shadow-md font-semibold'
                  : 'bg-surface text-muted hover:text-foreground hover:bg-surface-hover'
              }`}
            >
              {b.title}
            </button>
          ))}
        </div>
      )}

      {/* Board Body */}
      {error && !showCreateModal && <p role="alert" className="mb-5 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-600">{error}</p>}
      {boardsError ? (
        <div role="alert" className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <Layout className="mx-auto text-muted" size={36} />
          <h3 className="mt-4 text-lg font-semibold">Could not load project boards</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">The shared workspace service did not respond. Retry when the API is available.</p>
          <button onClick={() => refetchBoards()} className="mt-5 inline-flex h-10 items-center gap-2 justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface-hover cursor-pointer"><RefreshCw size={15} />Retry</button>
        </div>
      ) : boardsLoading || boardLoading ? (
        <div className="py-20 text-center text-muted">
          <Loader2 className="mx-auto animate-spin" size={28} />
          <p className="mt-2 text-sm">Loading project board...</p>
        </div>
      ) : boardError ? (
        <div role="alert" className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center">
          <Layout className="mx-auto text-muted" size={36} />
          <h3 className="mt-4 text-lg font-semibold">Could not open this board</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Try again, or choose another board from the list.</p>
          <button onClick={() => refetchBoard()} className="mt-5 inline-flex h-10 items-center gap-2 justify-center rounded-xl border border-border px-4 text-sm font-semibold text-foreground hover:bg-surface-hover cursor-pointer"><RefreshCw size={15} />Retry</button>
        </div>
      ) : !activeBoardId || boards.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface/50">
          <Layout className="mx-auto text-muted mb-4" size={36} />
          <h3 className="text-lg font-semibold">No Workspace Project Boards</h3>
          <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
            Create a collaborative board to manage tasks, sprints, and deliverables with your team.
          </p>
          <button
            onClick={() => { setError(null); setShowCreateModal(true); }}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            Create First Board
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {boardDetail?.columns?.map((col) => (
            <div key={col.id} className="rounded-2xl border border-border bg-surface/80 p-4 shadow-xs">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: col.color || '#3b82f6' }} />
                  <h3 className="font-semibold text-sm text-foreground">{col.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-background text-muted font-medium border border-border/40">
                    {col.cards.length}
                  </span>
                </div>
              </div>

              {/* Cards List */}
              <div className="space-y-3 min-h-[120px]">
                {col.cards.map((card) => (
                  <motion.div
                    key={card.id}
                    layout
                    className="p-3.5 rounded-xl border border-border bg-background shadow-xs hover:border-accent-blue/40 transition-colors group relative"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{card.title}</p>
                      <button
                        onClick={() => removeCard(card)}
                        disabled={deleteCard.isPending}
                        aria-label={`Delete ${card.title}`}
                        className="p-1 text-muted hover:text-red-500 transition-colors cursor-pointer md:opacity-0 md:group-hover:opacity-100"
                        title="Delete Card"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Add Card Form */}
              {activeColId === col.id ? (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newCardTitle.trim()) {
                      setError(null);
                      createCard.mutate({ columnId: col.id, title: newCardTitle.trim() });
                    }
                  }}
                  className="mt-3 space-y-2"
                >
                  <input
                    autoFocus
                    value={newCardTitle}
                    onChange={(e) => setNewCardTitle(e.target.value)}
                    placeholder="Enter card title..."
                    className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent-blue"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={createCard.isPending || !newCardTitle.trim()}
                      className="inline-flex h-8 items-center justify-center rounded-lg bg-accent-blue px-3 py-1 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Add Card
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveColId(null)}
                      className="inline-flex h-8 items-center justify-center rounded-lg border border-border px-3 py-1 text-xs font-medium text-muted hover:text-foreground transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => {
                    setActiveColId(col.id);
                    setNewCardTitle('');
                  }}
                  className="mt-3 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-1.5 text-xs font-medium text-muted hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Card
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Board Modal */}
      <Modal isOpen={showCreateModal} onClose={() => { if (!createBoard.isPending) { setShowCreateModal(false); setError(null); } }} title="Create Workspace Board">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) { setError(null); createBoard.mutate(); }
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="board-title">
              Board Title
            </label>
            <input
              id="board-title"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. Q3 Roadmap, Client Deliverables"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="board-desc">
              Description (Optional)
            </label>
            <textarea
              id="board-desc"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Brief summary of board goals..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-blue min-h-[80px]"
            />
          </div>
          {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
          <button
            disabled={createBoard.isPending || !newTitle.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 text-sm font-semibold text-white shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
          >
            {createBoard.isPending && <Loader2 size={16} className="animate-spin" />}
            Create Board
          </button>
        </form>
      </Modal>
    </div>
  );
}

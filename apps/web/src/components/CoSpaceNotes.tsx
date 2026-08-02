'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, FileText, Loader2, Pin, Trash2, Edit3, Check, Save, Heading1, CheckSquare, Code, Quote } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from './Modal';

type Note = {
  id: string;
  title: string;
  content: string | null;
  isPinned: boolean;
  updatedAt: string;
};

export function CoSpaceNotes({ workspaceId }: { workspaceId: string }) {
  const queryClient = useQueryClient();
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Fetch workspace notes
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['workspace-notes', workspaceId],
    queryFn: async () => {
      const { data } = await api.get(`/notes/workspaces/${workspaceId}`);
      return data.data as Note[];
    },
  });

  const activeNote = notes.find((n) => n.id === selectedNoteId) || notes[0] || null;

  // Create workspace note
  const createNote = useMutation({
    mutationFn: async () => {
      const { data } = await api.post(`/notes/workspaces/${workspaceId}`, { title: newTitle, content: newContent });
      return data.data as Note;
    },
    onSuccess: (note) => {
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      setSelectedNoteId(note.id);
      setShowCreateModal(false);
      setNewTitle('');
      setNewContent('');
    },
  });

  // Save note edit
  const saveNote = useMutation({
    mutationFn: async () => {
      if (!activeNote) return;
      await api.patch(`/notes/${activeNote.id}`, { title: editTitle, content: editContent });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      setIsEditing(false);
    },
  });

  // Delete note
  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/notes/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-notes', workspaceId] });
      if (activeNote?.id === selectedNoteId) setSelectedNoteId(null);
    },
  });

  const startEdit = () => {
    if (activeNote) {
      setEditTitle(activeNote.title);
      setEditContent(activeNote.content || '');
      setIsEditing(true);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 md:px-10 h-[calc(100vh-2rem)] flex flex-col">
      {/* Header */}
      <header className="mb-6 flex items-center justify-between shrink-0">
        <div>
          <p className="text-sm font-medium text-accent-blue">Workspace Documentation</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">Co-Notes</h1>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:bg-accent-blue-hover shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Plus size={17} />
          New Document
        </button>
      </header>

      {/* Main Split Layout */}
      {isLoading ? (
        <div className="py-20 text-center text-muted">
          <Loader2 className="mx-auto animate-spin" size={28} />
          <p className="mt-2 text-sm">Loading workspace notes...</p>
        </div>
      ) : notes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center bg-surface/50 my-auto">
          <FileText className="mx-auto text-muted mb-4" size={36} />
          <h3 className="text-lg font-semibold">No Workspace Documents</h3>
          <p className="mt-1 text-sm text-muted max-w-sm mx-auto">
            Create shared notes, meeting minutes, specs, and guidelines for your team.
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="mt-5 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus size={16} />
            Create First Document
          </button>
        </div>
      ) : (
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-6 min-h-0">
          {/* Notes Sidebar List */}
          <div className="md:col-span-4 rounded-2xl border border-border bg-surface/80 p-3 overflow-y-auto space-y-2">
            {notes.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setSelectedNoteId(n.id);
                  setIsEditing(false);
                }}
                className={`w-full p-3.5 rounded-xl text-left transition-all ${
                  (selectedNoteId || notes[0]?.id) === n.id
                    ? 'bg-accent-blue/10 border border-accent-blue/30 text-accent-blue font-medium'
                    : 'hover:bg-surface-hover text-foreground'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-sm truncate">{n.title}</h4>
                  {n.isPinned && <Pin size={13} className="text-accent-blue shrink-0" />}
                </div>
                <p className="mt-1 text-xs text-muted truncate">{n.content || 'No text content'}</p>
                <span className="mt-2 block text-[10px] text-muted">
                  {new Date(n.updatedAt).toLocaleDateString()}
                </span>
              </button>
            ))}
          </div>

          {/* Document Viewer / Editor */}
          {activeNote && (
            <div className="md:col-span-8 rounded-2xl border border-border bg-surface p-6 flex flex-col min-h-0 overflow-y-auto">
              <div className="flex items-center justify-between border-b border-border pb-4 mb-4 shrink-0">
                {isEditing ? (
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="text-2xl font-bold bg-background border border-border rounded-xl px-3 py-1 outline-none focus:border-accent-blue w-full max-w-md"
                  />
                ) : (
                  <h2 className="text-2xl font-bold text-foreground truncate">{activeNote.title}</h2>
                )}

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      onClick={() => saveNote.mutate()}
                      disabled={saveNote.isPending}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-accent-green px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs transition-all active:scale-95 cursor-pointer"
                    >
                      {saveNote.isPending ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} Save
                    </button>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-border px-3.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
                    >
                      <Edit3 size={14} /> Edit
                    </button>
                  )}

                  <button
                    onClick={() => deleteNote.mutate(activeNote.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-border text-muted hover:text-red-500 hover:bg-surface-hover transition-colors cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Note Content */}
              <div className="flex-1 min-h-0 flex flex-col">
                {isEditing ? (
                  <>
                    <div className="mb-2 flex items-center gap-1.5 p-1 rounded-xl bg-background border border-border shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditContent((prev) => prev ? `${prev}\n# ` : '# ')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-surface-hover flex items-center gap-1 text-foreground cursor-pointer"
                      >
                        <Heading1 size={14} /> Heading
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditContent((prev) => prev ? `${prev}\n- [ ] ` : '- [ ] ')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-surface-hover flex items-center gap-1 text-foreground cursor-pointer"
                      >
                        <CheckSquare size={14} /> Checklist
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditContent((prev) => prev ? `${prev}\n\`\`\`\n\n\`\`\`` : '```\n\n```')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-surface-hover flex items-center gap-1 text-foreground cursor-pointer"
                      >
                        <Code size={14} /> Code Block
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditContent((prev) => prev ? `${prev}\n> ` : '> ')}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg hover:bg-surface-hover flex items-center gap-1 text-foreground cursor-pointer"
                      >
                        <Quote size={14} /> Quote
                      </button>
                    </div>
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      placeholder="Write document in Markdown... (Type / or use block formatting toolbar above)"
                      className="w-full flex-1 min-h-[300px] rounded-xl border border-border bg-background p-4 text-sm font-mono text-foreground outline-none focus:border-accent-blue resize-none"
                    />
                  </>
                ) : (
                  <div className="prose dark:prose-invert max-w-none text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {activeNote.content || <span className="italic text-muted">Empty document content...</span>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create Workspace Document">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (newTitle.trim()) createNote.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="doc-title">
              Document Title
            </label>
            <input
              id="doc-title"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="e.g. System Architecture, Sprint Guidelines"
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-blue"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-foreground" htmlFor="doc-content">
              Initial Content (Optional)
            </label>
            <textarea
              id="doc-content"
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Start drafting document..."
              className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-blue min-h-[100px]"
            />
          </div>
          <button
            disabled={createNote.isPending || !newTitle.trim()}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 text-sm font-semibold text-white shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
          >
            {createNote.isPending && <Loader2 size={16} className="animate-spin" />}
            Create Document
          </button>
        </form>
      </Modal>
    </div>
  );
}

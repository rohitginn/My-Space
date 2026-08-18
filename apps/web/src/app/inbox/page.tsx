'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, 
  Trash2, 
  CheckSquare, 
  BookOpen, 
  Loader2, 
  Plus, 
  Edit3, 
  Check, 
  X, 
  Sparkles,
  ArrowRight,
  TrendingUp
} from 'lucide-react';
import api from '@/lib/api';
import { useDialog } from '@/components/DialogProvider';
import { QuickCapture } from '@/components/QuickCapture';
import { fadeSlideUp, fadeSlideUpItem, pressTap } from '@/lib/motion';

type InboxItem = {
  id: string;
  text: string;
  isProcessed: boolean;
  createdAt: string;
  processedAt: string | null;
};

export default function InboxPage() {
  const queryClient = useQueryClient();
  const { alert, confirm } = useDialog();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [convertTitle, setConvertTitle] = useState('');
  const [convertTarget, setConvertTarget] = useState<'todo' | 'note'>('todo');

  // Fetch inbox items
  const { data: items, isLoading } = useQuery<InboxItem[]>({
    queryKey: ['inbox'],
    queryFn: async () => {
      const { data } = await api.get('/inbox');
      return data.data;
    }
  });

  // Edit item mutation
  const editMutation = useMutation({
    mutationFn: async (vars: { id: string; text: string }) => {
      const { data } = await api.patch(`/inbox/${vars.id}`, { text: vars.text });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      setEditingId(null);
    }
  });

  // Delete item mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/inbox/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
    }
  });

  // Convert item mutation
  const convertMutation = useMutation({
    mutationFn: async (vars: { id: string; target: 'todo' | 'note'; title: string }) => {
      const { data } = await api.post(`/inbox/${vars.id}/convert`, { 
        target: vars.target, 
        title: vars.title 
      });
      return data.data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setConvertingId(null);
      setConvertTitle('');
      alert(`Success! Captured item converted to ${vars.target === 'todo' ? 'a task' : 'a note'}. (+5 XP)`);
    }
  });

  const handleStartEdit = (item: InboxItem) => {
    setEditingId(item.id);
    setEditingText(item.text);
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) {
      editMutation.mutate({ id, text: editingText.trim() });
    }
  };

  const handleStartConvert = (item: InboxItem, target: 'todo' | 'note') => {
    setConvertingId(item.id);
    setConvertTarget(target);
    setConvertTitle(item.text.slice(0, 100));
  };

  const handleSaveConvert = () => {
    if (convertingId && convertTitle.trim()) {
      convertMutation.mutate({ 
        id: convertingId, 
        target: convertTarget, 
        title: convertTitle.trim() 
      });
    }
  };

  const pendingItems = items?.filter(item => !item.isProcessed) || [];
  const processedItems = items?.filter(item => item.isProcessed) || [];

  return (
    <div className="flex min-h-full w-full flex-col bg-background p-4 relative overflow-y-auto sm:p-8 lg:h-full lg:overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="mb-6 flex flex-col items-start gap-3 z-10 shrink-0 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Inbox className="text-accent-blue" size={28} />
            Inbox & Triage
          </h1>
          <p className="text-muted mt-2">Dump your raw ideas, tasks, or reference points. Triage them when ready.</p>
        </div>
      </header>

      {/* Quick Capture Input */}
      <div className="mb-8 max-w-xl z-10 shrink-0">
        <QuickCapture placeholder="Capture any thought or idea instantly..." />
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-8 overflow-visible z-10 lg:grid-cols-3 lg:overflow-hidden">
        {/* Inbox Items Column */}
        <div className="lg:col-span-2 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="font-semibold text-foreground text-sm uppercase tracking-wider flex items-center gap-2">
              📥 Captured thoughts ({pendingItems.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-4 pb-8">
            {isLoading ? (
              <div className="flex items-center justify-center p-12 text-muted">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading inbox...
              </div>
            ) : pendingItems.length === 0 ? (
              <div className="border border-dashed border-border bg-surface/30 rounded-2xl p-12 text-center text-muted">
                <Inbox size={40} className="mx-auto mb-3 opacity-30" />
                <p className="font-medium text-foreground">Your inbox is clear!</p>
                <p className="text-xs text-muted mt-1">Use Quick Capture to add things to process later.</p>
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {pendingItems.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="bg-surface/50 border border-border rounded-xl p-5 hover:border-accent-blue/30 transition-all duration-300 shadow-sm flex flex-col gap-4"
                  >
                    {editingId === item.id ? (
                      <div className="flex flex-col gap-2">
                        <textarea
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-accent-blue focus:outline-none resize-none h-20"
                        />
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                          >
                            <X size={16} />
                          </button>
                          <button
                            onClick={() => handleSaveEdit(item.id)}
                            disabled={editMutation.isPending || !editingText.trim()}
                            className="bg-accent-blue text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-accent-blue-hover transition-colors"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex justify-between items-start gap-4">
                          <p className="text-foreground text-sm font-medium leading-relaxed whitespace-pre-wrap flex-1">{item.text}</p>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleStartEdit(item)}
                              className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                              title="Edit text"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm('Delete this captured thought?')) {
                                  deleteMutation.mutate(item.id);
                                }
                              }}
                              className="p-1.5 text-muted hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-colors"
                              title="Delete thought"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Conversion Triage Controls */}
                        {convertingId === item.id ? (
                          <motion.div 
                            initial={{ opacity: 0, y: -5 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-surface/80 border border-border/80 rounded-lg p-3.5 flex flex-col gap-3"
                          >
                            <div>
                              <label className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                                {convertTarget === 'todo' ? 'Task Title' : 'Note Title'}
                              </label>
                              <input
                                type="text"
                                value={convertTitle}
                                onChange={(e) => setConvertTitle(e.target.value)}
                                className="w-full bg-surface border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:border-accent-blue focus:outline-none"
                              />
                            </div>
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => setConvertingId(null)}
                                className="px-2.5 py-1 text-xs text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSaveConvert}
                                disabled={convertMutation.isPending || !convertTitle.trim()}
                                className="bg-accent-green text-white px-3 py-1 rounded-lg text-xs font-semibold hover:bg-accent-green-hover transition-colors flex items-center gap-1"
                              >
                                {convertMutation.isPending ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Convert
                              </button>
                            </div>
                          </motion.div>
                        ) : (
                          <div className="flex gap-2 border-t border-border/40 pt-3">
                            <button
                              onClick={() => handleStartConvert(item, 'todo')}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-surface hover:bg-surface-hover border border-border rounded-xl py-2 text-xs font-semibold text-foreground transition-all duration-200"
                            >
                              <CheckSquare size={13} className="text-accent-blue" />
                              Convert to Task
                            </button>
                            <button
                              onClick={() => handleStartConvert(item, 'note')}
                              className="flex-1 flex items-center justify-center gap-1.5 bg-surface hover:bg-surface-hover border border-border rounded-xl py-2 text-xs font-semibold text-foreground transition-all duration-200"
                            >
                              <BookOpen size={13} className="text-accent-green" />
                              Convert to Note
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* Processed Archive Column */}
        <div className="flex flex-col h-full overflow-hidden border-l border-border/40 pl-4">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h2 className="font-semibold text-muted text-sm uppercase tracking-wider flex items-center gap-2">
              ✅ Triaged history ({processedItems.length})
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-8">
            {processedItems.length === 0 ? (
              <div className="bg-surface/10 border border-dashed border-border/50 rounded-xl p-8 text-center text-muted text-xs">
                No items have been triaged yet.
              </div>
            ) : (
              processedItems.map((item) => (
                <div 
                  key={item.id}
                  className="bg-surface/20 border border-border/50 rounded-lg p-3.5 flex flex-col gap-1.5 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <p className="text-foreground text-xs font-medium line-through leading-relaxed">{item.text}</p>
                  <span className="text-[10px] text-muted font-medium">
                    Processed {item.processedAt ? new Date(item.processedAt).toLocaleDateString() : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

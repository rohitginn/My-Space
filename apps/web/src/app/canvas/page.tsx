'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Palette, Loader2, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { useDialog } from '@/components/DialogProvider';

type Drawing = {
  id: string;
  title: string;
  updatedAt: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { type: 'spring', stiffness: 100, damping: 15 } 
  }
} as const;

export default function CanvasDashboard() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { confirm, prompt } = useDialog();

  const { data: drawings, isLoading, isError } = useQuery({
    queryKey: ['drawings'],
    queryFn: async () => {
      const { data } = await api.get('/drawings');
      return data.data as Drawing[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/drawings', { title: 'Untitled Drawing' });
      return data.data as Drawing;
    },
    onSuccess: (newDrawing) => {
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
      router.push(`/canvas/${newDrawing.id}`);
    }
  });

  const renameMutation = useMutation({
    mutationFn: async (vars: { id: string; title: string }) => {
      await api.patch(`/drawings/${vars.id}`, { title: vars.title });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/drawings/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drawings'] });
    }
  });

  const handleRename = async (drawing: Drawing) => {
    const newTitle = await prompt('Rename board title:', { defaultValue: drawing.title });
    if (newTitle && newTitle.trim() && newTitle !== drawing.title) {
      renameMutation.mutate({ id: drawing.id, title: newTitle.trim() });
    }
  };

  const handleDelete = async (drawing: Drawing) => {
    if (await confirm(`Are you sure you want to delete "${drawing.title}"?`)) {
      deleteMutation.mutate(drawing.id);
    }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="w-full max-w-6xl mx-auto overflow-y-auto p-4 sm:p-8"
    >
      <motion.header variants={itemVariants} className="mb-12 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Palette className="text-accent-blue" size={36} />
            Canvas Boards
          </h1>
          <p className="text-muted mt-2 text-lg">Brainstorm, sketch ideas, and build visual diagrams.</p>
        </div>
        
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => createMutation.mutate()}
          disabled={createMutation.isPending}
          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-accent-blue hover:bg-accent-blue-hover text-white transition-colors shadow-lg shadow-accent-blue/20 shrink-0 font-medium disabled:opacity-50"
        >
          {createMutation.isPending ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <Plus size={20} />
          )}
          New Canvas
        </motion.button>
      </motion.header>

      {isLoading ? (
        <div className="flex items-center justify-center p-24 text-muted">
          <Loader2 className="animate-spin mr-2" size={24} />
          Loading boards...
        </div>
      ) : isError ? (
        <div className="p-6 bg-red-500/10 text-red-500 rounded-xl">
          Failed to load canvas boards. Please try again.
        </div>
      ) : !drawings || drawings.length === 0 ? (
        <motion.div 
          variants={itemVariants} 
          className="bg-surface/50 border border-dashed border-border rounded-2xl p-16 text-center text-muted max-w-lg mx-auto mt-12"
        >
          <Palette className="mx-auto mb-4 text-muted/50" size={48} />
          <h3 className="text-lg font-medium text-foreground mb-2">No drawings yet</h3>
          <p className="text-sm text-muted mb-6">Create your first whiteboarding session to start sketching ideas.</p>
          <button 
            onClick={() => createMutation.mutate()}
            className="px-4 py-2 rounded-lg bg-surface border border-border hover:bg-surface-hover transition-colors font-medium text-foreground"
          >
            Create Board
          </button>
        </motion.div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {drawings.map((drawing) => (
            <div 
              key={drawing.id}
              onClick={() => router.push(`/canvas/${drawing.id}`)}
              className="group bg-surface-glass border border-border/50 hover:border-border p-6 rounded-2xl transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer relative overflow-hidden flex flex-col justify-between min-h-[160px]"
            >
              <div className="flex justify-between items-start gap-4">
                <h3 className="text-foreground font-semibold text-lg group-hover:text-accent-blue transition-colors truncate">
                  {drawing.title}
                </h3>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleRename(drawing); }}
                    className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-all"
                    title="Rename"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(drawing); }}
                    className="p-1.5 text-red-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
                <Calendar size={14} />
                <span>Updated {new Date(drawing.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
}

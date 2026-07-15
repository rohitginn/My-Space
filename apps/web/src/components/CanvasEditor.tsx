// ============================================================
// Canvas Editor - Uses Custom SVG Infinite Canvas Engine
// ============================================================

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, CloudLightning, Check, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { InfiniteCanvas, useCanvasEngine } from '@/lib/canvas';
import type { CanvasDocument } from '@/lib/canvas';

function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  debounced.cancel = () => {
    if (timeout) clearTimeout(timeout);
  };
  return debounced;
}

type DrawingDetail = {
  id: string;
  title: string;
  documentData: any;
};

function CanvasEditorInner({ id, drawing }: { id: string; drawing: DrawingDetail }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');

  // Initialize the custom canvas engine with loaded data
  const engine = useCanvasEngine(drawing.documentData as CanvasDocument | undefined);

  const saveMutation = useMutation({
    mutationFn: async (documentData: any) => {
      await api.patch(`/drawings/${id}`, { documentData });
    },
    onSuccess: () => {
      setSaveStatus('saved');
    },
    onError: () => {
      setSaveStatus('error');
    },
  });

  // Debounced save
  const debouncedSave = useRef(
    debounce((data: CanvasDocument) => {
      setSaveStatus('saving');
      saveMutation.mutate(data);
    }, 2000)
  ).current;

  useEffect(() => {
    return () => debouncedSave.cancel();
  }, [debouncedSave]);

  // Callback when canvas content changes
  const handleChanged = useCallback(() => {
    const doc = engine.getDocument();
    debouncedSave(doc);
  }, [engine, debouncedSave]);

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
            onClick={() => router.push('/canvas')}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft size={20} />
          </motion.button>

          <h2 className="text-foreground font-semibold text-sm truncate max-w-[200px] md:max-w-sm">
            {drawing.title}
          </h2>
        </div>

        {/* Save Status */}
        <div className="flex items-center gap-2 text-xs font-medium">
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
        <InfiniteCanvas engine={engine} onChanged={handleChanged} />
      </div>
    </div>
  );
}

export default function CanvasEditor({ id }: { id: string }) {
  const router = useRouter();

  const { data: drawing, isLoading, isError } = useQuery({
    queryKey: ['drawings', id],
    queryFn: async () => {
      const { data } = await api.get(`/drawings/${id}`);
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
          onClick={() => router.push('/canvas')}
          className="px-4 py-2 bg-surface hover:bg-surface-hover border border-border text-foreground rounded-lg transition-colors font-medium"
        >
          Back to Boards
        </button>
      </div>
    );
  }

  return <CanvasEditorInner id={id} drawing={drawing} />;
}

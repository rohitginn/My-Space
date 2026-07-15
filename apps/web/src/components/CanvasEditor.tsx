'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Loader2, CloudLightning, Check, AlertCircle } from 'lucide-react';
import { Tldraw, getSnapshot, loadSnapshot, createTLStore, defaultShapeUtils } from 'tldraw';
import api from '@/lib/api';

import 'tldraw/tldraw.css';

function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: NodeJS.Timeout | null = null;
  const debounced = (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
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

export default function CanvasEditor({ id }: { id: string }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const storeRef = useRef<any>(null);

  const { data: drawing, isLoading, isError } = useQuery({
    queryKey: ['drawings', id],
    queryFn: async () => {
      const { data } = await api.get(`/drawings/${id}`);
      return data.data as DrawingDetail;
    }
  });

  const saveMutation = useMutation({
    mutationFn: async (documentData: any) => {
      await api.patch(`/drawings/${id}`, { documentData });
    },
    onSuccess: () => {
      setSaveStatus('saved');
      queryClient.invalidateQueries({ queryKey: ['drawings', id] });
    },
    onError: () => {
      setSaveStatus('error');
    }
  });

  // Debounced save handler
  const debouncedSave = useRef(
    debounce((data: any) => {
      setSaveStatus('saving');
      saveMutation.mutate(data);
    }, 2000)
  ).current;

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      debouncedSave.cancel();
    };
  }, [debouncedSave]);

  // Create tldraw store with initial document data
  const getStore = () => {
    if (!storeRef.current && drawing) {
      const store = createTLStore({ shapeUtils: defaultShapeUtils });
      if (drawing.documentData && Object.keys(drawing.documentData).length > 0) {
        try {
          loadSnapshot(store, { document: drawing.documentData });
        } catch (e) {
          console.error('Failed to load drawing snapshot:', e);
        }
      }
      storeRef.current = store;
    }
    return storeRef.current;
  };

  const handleMount = (editor: any) => {
    // Setup listener on store updates
    const unlisten = editor.store.listen((event: any) => {
      if (event.source === 'user') {
        const snapshot = getSnapshot(editor.store);
        debouncedSave(snapshot.document);
      }
    });

    return () => {
      unlisten();
    };
  };

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

  const store = getStore();

  return (
    <div className="w-full h-screen flex flex-col relative bg-background overflow-hidden">
      {/* Top Navbar */}
      <header className="h-14 border-b border-border bg-surface/85 backdrop-blur flex items-center justify-between px-4 z-20 shrink-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => router.push('/canvas')}
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
            title="Back to Dashboard"
          >
            <ChevronLeft size={20} />
          </button>
          
          <h2 className="text-foreground font-semibold text-sm truncate max-w-[200px] md:max-w-sm">
            {drawing.title}
          </h2>
        </div>

        {/* Save Status Indicators */}
        <div className="flex items-center gap-2 text-xs font-medium">
          {saveStatus === 'saving' && (
            <div className="flex items-center gap-1.5 text-accent-blue bg-accent-blue/10 px-2.5 py-1 rounded-full">
              <Loader2 size={12} className="animate-spin" />
              <span>Saving changes...</span>
            </div>
          )}
          {saveStatus === 'saved' && (
            <div className="flex items-center gap-1.5 text-accent-green bg-accent-green/10 px-2.5 py-1 rounded-full">
              <Check size={12} />
              <span>Autosaved</span>
            </div>
          )}
          {saveStatus === 'error' && (
            <div className="flex items-center gap-1.5 text-red-500 bg-red-500/10 px-2.5 py-1 rounded-full">
              <CloudLightning size={12} />
              <span>Error saving</span>
            </div>
          )}
        </div>
      </header>

      {/* Drawing Workspace */}
      <div className="flex-1 w-full relative z-10">
        {store && (
          <Tldraw 
            store={store} 
            onMount={handleMount}
          />
        )}
      </div>
    </div>
  );
}

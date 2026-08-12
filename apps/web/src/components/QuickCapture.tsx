'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import api from '@/lib/api';
import { EASE_OUT, pressTap } from '@/lib/motion';

type QuickCaptureProps = {
  autoFocus?: boolean;
  placeholder?: string;
  onCaptured?: () => void;
};

export function QuickCapture({
  autoFocus,
  placeholder = 'Capture a thought… triage it later in Inbox',
  onCaptured,
}: QuickCaptureProps) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmationTimerRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
  }, []);

  const captureMutation = useMutation({
    mutationFn: async (value: string) => {
      const { data } = await api.post('/inbox', { text: value });
      return data.data;
    },
    onSuccess: () => {
      setText('');
      setShowConfirmation(true);
      queryClient.invalidateQueries({ queryKey: ['inbox'] });
      onCaptured?.();
      if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
      confirmationTimerRef.current = window.setTimeout(() => {
        confirmationTimerRef.current = null;
        setShowConfirmation(false);
      }, 1500);
    },
  });

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || captureMutation.isPending) return;
    captureMutation.mutate(trimmed);
  };

  return (
    <div className="relative">
      <div className="bg-surface border border-border rounded-xl px-4 py-3 flex items-center gap-3">
        <input
          type="text"
          value={text}
          autoFocus={autoFocus}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted/60"
        />
        <motion.button
          whileTap={pressTap}
          onClick={submit}
          disabled={!text.trim() || captureMutation.isPending}
          className="bg-accent-green hover:bg-accent-green-hover text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 disabled:opacity-50 shrink-0"
        >
          {captureMutation.isPending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <ArrowRight size={14} />
          )}
          Capture
        </motion.button>
      </div>

      <AnimatePresence>
        {showConfirmation && (
          <motion.span
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="absolute right-1 -bottom-6 text-xs text-accent-green flex items-center gap-1"
          >
            <Check size={12} /> Captured → Inbox
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}

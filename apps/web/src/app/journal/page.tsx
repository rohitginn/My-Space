// ============================================================
// Journal — daily entries, moods & streaks
// ============================================================

'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Award,
  BookOpen,
  Check,
  CloudRain,
  Flame,
  Frown,
  Laugh,
  Loader2,
  Meh,
  PenLine,
  Smile,
  Trash2,
} from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';
import { EASE_OUT, fadeSlideUp, fadeSlideUpItem, hoverLift, pressTap, staggerParent } from '@/lib/motion';

type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';

type JournalEntry = {
  id: string;
  entryDate: string;
  title: string | null;
  content: string;
  mood: Mood | null;
  createdAt?: string;
  updatedAt?: string;
};

type JournalStats = {
  totalEntries: number;
  currentStreak: number;
  longestStreak: number;
  moodCounts: Record<Mood, number>;
};

const MOOD_OPTIONS: Array<{ value: Mood; label: string; icon: typeof Laugh }> = [
  { value: 'great', label: 'Great', icon: Laugh },
  { value: 'good', label: 'Good', icon: Smile },
  { value: 'okay', label: 'Okay', icon: Meh },
  { value: 'low', label: 'Low', icon: Frown },
  { value: 'rough', label: 'Rough', icon: CloudRain },
];

function localDateStr(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function formatEntryDate(entryDate: string) {
  // Anchor at noon local time so the date never shifts across timezones
  return new Date(`${entryDate}T12:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function MoodSelector({
  mood,
  onChange,
  compact,
}: {
  mood: Mood | null;
  onChange: (mood: Mood | null) => void;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-wrap ${compact ? 'gap-1.5' : 'gap-2'}`}>
      {MOOD_OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mood === value;
        return (
          <motion.button
            key={value}
            type="button"
            whileTap={pressTap}
            animate={{ scale: selected ? 1.1 : 1 }}
            transition={{ type: 'spring', duration: 0.2, bounce: 0.25 }}
            onClick={() => onChange(selected ? null : value)}
            aria-pressed={selected}
            className={`flex items-center gap-1.5 rounded-lg border transition-colors ${
              compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
            } ${
              selected
                ? 'border-accent-blue ring-2 ring-accent-blue/30 text-foreground bg-accent-blue/5'
                : 'border-border text-muted hover:bg-surface-hover hover:text-foreground'
            }`}
          >
            <Icon size={compact ? 16 : 20} className={selected ? 'text-accent-blue' : ''} />
            {label}
          </motion.button>
        );
      })}
    </div>
  );
}

function JournalPageContent() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { confirm } = useDialog();
  const todayStr = localDateStr();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [showSaved, setShowSaved] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{ title: string; content: string; mood: Mood | null }>({
    title: '',
    content: '',
    mood: null,
  });
  const preloadedRef = useRef(false);
  const moodParamAppliedRef = useRef(false);

  const { data: entries, isLoading } = useQuery({
    queryKey: ['journal'],
    queryFn: async () => {
      const { data } = await api.get('/journal');
      return data.data as JournalEntry[];
    },
  });

  const { data: stats } = useQuery({
    queryKey: ['journal', 'stats'],
    queryFn: async () => {
      const { data } = await api.get('/journal/stats/summary');
      return data.data as JournalStats;
    },
  });

  const todayEntry = entries?.find((e) => e.entryDate === todayStr) ?? null;

  // Preload today's entry into the editor once entries arrive
  useEffect(() => {
    if (preloadedRef.current || !entries) return;
    preloadedRef.current = true;
    if (todayEntry) {
      setTitle(todayEntry.title || '');
      setContent(todayEntry.content || '');
      setMood(todayEntry.mood);
    }
  }, [entries, todayEntry]);

  // Apply ?mood= preselect (existing entry mood wins once loaded)
  useEffect(() => {
    if (moodParamAppliedRef.current) return;
    const param = searchParams.get('mood') as Mood | null;
    if (param && MOOD_OPTIONS.some((m) => m.value === param)) {
      moodParamAppliedRef.current = true;
      setMood((current) => current ?? param);
    }
  }, [searchParams]);

  const invalidateJournal = () => {
    queryClient.invalidateQueries({ queryKey: ['journal'] });
    queryClient.invalidateQueries({ queryKey: ['journal', 'stats'] });
    queryClient.invalidateQueries({ queryKey: ['today'] });
    queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/journal', {
        entryDate: todayStr,
        title: title.trim() || null,
        content,
        mood,
      });
      return data.data;
    },
    onSuccess: () => {
      invalidateJournal();
      setShowSaved(true);
      window.setTimeout(() => setShowSaved(false), 1500);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { id: string; title: string | null; content: string; mood: Mood | null }) => {
      const { data } = await api.patch(`/journal/${vars.id}`, {
        title: vars.title,
        content: vars.content,
        mood: vars.mood,
      });
      return data.data;
    },
    onSuccess: () => {
      invalidateJournal();
      setIsEditing(false);
      setSelectedEntry(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/journal/${id}`);
    },
    onSuccess: () => {
      invalidateJournal();
      setSelectedEntry(null);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 h-full flex items-center justify-center text-muted">
        <Loader2 className="animate-spin mr-3" /> Loading Journal...
      </div>
    );
  }

  const pastEntries = (entries ?? []).filter((e) => e.entryDate !== todayStr);
  const selectedMoodMeta = selectedEntry?.mood
    ? MOOD_OPTIONS.find((m) => m.value === selectedEntry.mood)
    : null;

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="flex justify-between items-end mb-8 z-10 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <BookOpen className="text-accent-blue" size={28} />
            Journal
          </h1>
          <p className="text-muted mt-2">One honest page a day. Moods, memories, momentum.</p>
          {stats && (
            <div className="flex flex-wrap gap-2 mt-4">
              <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
                <Flame size={16} className="text-orange-500" /> {stats.currentStreak}-day streak
              </span>
              <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
                <BookOpen size={16} className="text-accent-blue" /> {stats.totalEntries} entries
              </span>
              <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
                <Award size={16} className="text-accent-green" /> longest {stats.longestStreak}
              </span>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto z-10">
        <div className="max-w-4xl mx-auto w-full pb-8">
          {/* ── Today's editor ─────────────────────────────── */}
          <motion.div {...fadeSlideUp} className="bg-surface border border-border rounded-xl p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs uppercase tracking-wider font-bold text-muted flex items-center gap-1.5">
                <PenLine size={14} /> Today's Entry
              </h2>
              <span className="text-xs text-muted">{formatEntryDate(todayStr)}</span>
            </div>

            <div className="mb-4">
              <MoodSelector mood={mood} onChange={setMood} />
            </div>

            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Give today a title (optional)"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 mb-3 text-foreground placeholder:text-muted/60 focus:border-accent-blue focus:outline-none"
            />
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What happened today? What are you thinking about?"
              className="w-full min-h-[180px] bg-surface border border-border rounded-xl p-4 text-foreground placeholder:text-muted/60 focus:border-accent-blue focus:outline-none resize-y"
            />

            <div className="flex items-center justify-between mt-3">
              <span className="text-xs text-muted">{wordCount(content)} words</span>
              <div className="flex items-center gap-3">
                <AnimatePresence>
                  {showSaved && (
                    <motion.span
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, ease: EASE_OUT }}
                      className="text-xs text-accent-green flex items-center gap-1"
                    >
                      <Check size={12} /> Saved
                    </motion.span>
                  )}
                </AnimatePresence>
                <motion.button
                  whileTap={pressTap}
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending || !content.trim()}
                  className="bg-accent-green hover:bg-accent-green-hover text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saveMutation.isPending && <Loader2 size={16} className="animate-spin" />}
                  {todayEntry ? 'Update Entry' : 'Save Entry'}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* ── Past entries ───────────────────────────────── */}
          <h2 className="text-xs uppercase tracking-wider font-bold text-muted mb-4">Past Entries</h2>
          {pastEntries.length === 0 ? (
            <div className="border border-dashed border-border rounded-xl p-12 text-center text-muted flex flex-col items-center">
              <BookOpen size={40} className="text-muted/30 mb-4" />
              <p>Start your first entry above.</p>
            </div>
          ) : (
            <motion.div
              variants={staggerParent}
              initial="initial"
              animate="animate"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              {pastEntries.map((entry) => {
                const moodMeta = entry.mood ? MOOD_OPTIONS.find((m) => m.value === entry.mood) : null;
                const MoodIcon = moodMeta?.icon;
                return (
                  <motion.button
                    key={entry.id}
                    variants={fadeSlideUpItem}
                    whileHover={hoverLift}
                    onClick={() => {
                      setSelectedEntry(entry);
                      setIsEditing(false);
                      setEditForm({ title: entry.title || '', content: entry.content, mood: entry.mood });
                    }}
                    className="bg-surface border border-border rounded-xl p-5 text-left hover:border-accent-blue/30 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted">{formatEntryDate(entry.entryDate)}</span>
                      {moodMeta && MoodIcon && (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <MoodIcon size={14} /> {moodMeta.label}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-foreground truncate">
                      {entry.title || entry.content.split('\n')[0] || 'Untitled'}
                    </h3>
                    <p className="text-sm text-muted mt-1 line-clamp-2">{entry.content}</p>
                    <span className="text-xs text-muted mt-3 block">{wordCount(entry.content)} words</span>
                  </motion.button>
                );
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* ── View / edit modal ──────────────────────────────── */}
      <Modal
        isOpen={!!selectedEntry}
        onClose={() => setSelectedEntry(null)}
        title={selectedEntry ? formatEntryDate(selectedEntry.entryDate) : ''}
        maxWidth="max-w-2xl"
      >
        {selectedEntry && !isEditing && (
          <div className="space-y-4">
            {selectedMoodMeta && (
              <span className="inline-flex items-center gap-1.5 text-sm text-muted bg-surface-hover border border-border rounded-lg px-3 py-1.5">
                <selectedMoodMeta.icon size={16} /> Feeling {selectedMoodMeta.label.toLowerCase()}
              </span>
            )}
            {selectedEntry.title && (
              <h3 className="text-lg font-semibold text-foreground">{selectedEntry.title}</h3>
            )}
            <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed max-h-[50vh] overflow-y-auto">
              {selectedEntry.content}
            </p>
            <div className="flex items-center justify-between pt-2 border-t border-border">
              <span className="text-xs text-muted">{wordCount(selectedEntry.content)} words</span>
              <div className="flex gap-3">
                <motion.button
                  whileTap={pressTap}
                  onClick={async () => {
                    if (await confirm('Delete this entry? This cannot be undone.')) {
                      deleteMutation.mutate(selectedEntry.id);
                    }
                  }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-1.5 text-sm text-red-500 border border-border hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
                >
                  <Trash2 size={14} /> Delete
                </motion.button>
                <motion.button
                  whileTap={pressTap}
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 text-sm text-accent-blue border border-border hover:bg-surface-hover px-3 py-1.5 rounded-lg transition-colors"
                >
                  <PenLine size={14} /> Edit
                </motion.button>
              </div>
            </div>
          </div>
        )}

        {selectedEntry && isEditing && (
          <div className="space-y-4">
            <MoodSelector
              compact
              mood={editForm.mood}
              onChange={(m) => setEditForm({ ...editForm, mood: m })}
            />
            <input
              type="text"
              value={editForm.title}
              onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
              placeholder="Title (optional)"
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted/60 focus:border-accent-blue focus:outline-none"
            />
            <textarea
              value={editForm.content}
              onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
              className="w-full min-h-[200px] bg-surface border border-border rounded-xl p-4 text-foreground placeholder:text-muted/60 focus:border-accent-blue focus:outline-none resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted">{wordCount(editForm.content)} words</span>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-sm text-muted hover:text-foreground font-medium"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={pressTap}
                  onClick={() =>
                    updateMutation.mutate({
                      id: selectedEntry.id,
                      title: editForm.title.trim() || null,
                      content: editForm.content,
                      mood: editForm.mood,
                    })
                  }
                  disabled={updateMutation.isPending || !editForm.content.trim()}
                  className="bg-accent-green hover:bg-accent-green-hover text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {updateMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Save Changes
                </motion.button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export default function JournalPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 h-full flex items-center justify-center text-muted">
          <Loader2 className="animate-spin mr-3" /> Loading Journal...
        </div>
      }
    >
      <JournalPageContent />
    </Suspense>
  );
}

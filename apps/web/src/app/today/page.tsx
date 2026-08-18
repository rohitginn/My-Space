// ============================================================
// Today — Daily Command Center
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Activity,
  BookOpen,
  Calendar as CalendarIcon,
  Check,
  CheckSquare,
  CloudRain,
  Flame,
  Frown,
  Laugh,
  Loader2,
  Meh,
  Smile,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { QuickCapture } from '@/components/QuickCapture';
import { fadeSlideUp, fadeSlideUpItem, pressTap, staggerParent } from '@/lib/motion';

type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';

type TodayTask = {
  id: string;
  title: string;
  dueDate: string | null;
  isCompleted: boolean;
  priority?: string;
};

type TodayHabit = {
  id: string;
  name: string;
  color: string | null;
  icon?: string | null;
  frequency: string;
  targetCount: number;
  todayCount: number;
  currentStreak: number;
};

type TodayEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  isAllDay: boolean;
  color: string | null;
};

type TodayData = {
  date: string;
  tasksDue: TodayTask[];
  tasksOverdue: TodayTask[];
  tasksCompletedToday: number;
  habits: TodayHabit[];
  events: TodayEvent[];
  focus: { minutesToday: number; sessionsToday: number };
  journal: { hasEntryToday: boolean; mood: Mood | null };
  user: { xp: number; level: number; currentStreak: number };
};

const MOOD_OPTIONS: Array<{ value: Mood; label: string; icon: typeof Laugh }> = [
  { value: 'great', label: 'Great', icon: Laugh },
  { value: 'good', label: 'Good', icon: Smile },
  { value: 'okay', label: 'Okay', icon: Meh },
  { value: 'low', label: 'Low', icon: Frown },
  { value: 'rough', label: 'Rough', icon: CloudRain },
];

const RING_RADIUS = 14;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function formatEventTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function TodayPage() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const { user } = useAuth();

  // Greeting/date are client-only (avoid SSR/client hour & timezone mismatch)
  const [greeting, setGreeting] = useState('Hello');
  const [dateLine, setDateLine] = useState('Today at a glance');

  useEffect(() => {
    const now = new Date();
    const hour = now.getHours();
    setGreeting(hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
    setDateLine(now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }));
  }, []);

  const { data: today, isLoading } = useQuery({
    queryKey: ['today'],
    queryFn: async () => {
      const { data } = await api.get('/today');
      return data.data as TodayData;
    },
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/todos/${id}`, { isCompleted: true });
      return data.data;
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['today'] });
      const previous = queryClient.getQueryData<TodayData>(['today']);
      if (previous) {
        const markDone = (tasks: TodayTask[]) =>
          tasks.map((t) => (t.id === id ? { ...t, isCompleted: true } : t));
        queryClient.setQueryData<TodayData>(['today'], {
          ...previous,
          tasksDue: markDone(previous.tasksDue),
          tasksOverdue: markDone(previous.tasksOverdue),
          tasksCompletedToday: previous.tasksCompletedToday + 1,
        });
      }
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['today'], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const logHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/habits/${id}/log`, { logDate: new Date().toISOString() });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 h-full flex items-center justify-center text-muted">
        <Loader2 className="animate-spin mr-3" /> Loading your day...
      </div>
    );
  }

  const tasksDue = today?.tasksDue ?? [];
  const tasksOverdue = today?.tasksOverdue ?? [];
  const habits = today?.habits ?? [];
  const events = [...(today?.events ?? [])].sort((a, b) => {
    if (a.isAllDay !== b.isAllDay) return a.isAllDay ? -1 : 1;
    return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
  });
  const noTasks = tasksDue.length === 0 && tasksOverdue.length === 0;
  const level = today?.user.level ?? user?.level ?? 1;
  const xp = today?.user.xp ?? user?.xp ?? 0;
  const streak = today?.user.currentStreak ?? user?.currentStreak ?? 0;
  const journalMood = today?.journal.mood
    ? MOOD_OPTIONS.find((m) => m.value === today.journal.mood)
    : null;

  return (
    <div className="flex min-h-full w-full flex-col bg-background p-4 relative overflow-y-auto sm:p-8 lg:h-full lg:overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="mb-6 flex flex-col items-start gap-4 z-10 shrink-0 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">
            {greeting}{user?.displayName ? `, ${user.displayName}` : ''}
          </h1>
          <p className="text-muted mt-2">{dateLine}</p>
          <div className="flex flex-wrap gap-2 mt-4">
            <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
              <Zap size={16} className="text-accent-blue" /> Level {level} · {xp} XP
            </span>
            <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
              <Flame size={16} className="text-orange-500" /> {streak}-day streak
            </span>
            <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
              <Timer size={16} className="text-accent-blue" /> {today?.focus.minutesToday ?? 0}m focused
            </span>
            <span className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm flex items-center gap-1">
              <CheckSquare size={16} className="text-accent-green" /> {today?.tasksCompletedToday ?? 0} tasks done
            </span>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto z-10">
        <div className="max-w-5xl mx-auto w-full pb-8">
          <motion.div {...fadeSlideUp} className="mb-8">
            <QuickCapture onCaptured={() => queryClient.invalidateQueries({ queryKey: ['today'] })} />
          </motion.div>

          <motion.div
            variants={staggerParent}
            initial="initial"
            animate="animate"
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* ── Tasks ─────────────────────────────────────── */}
            <motion.div variants={fadeSlideUpItem} className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-wider font-bold text-muted flex items-center gap-1.5">
                  <CheckSquare size={14} /> Tasks
                </h2>
                {!noTasks && (
                  <span className="text-xs text-muted">
                    {tasksDue.filter((t) => !t.isCompleted).length + tasksOverdue.filter((t) => !t.isCompleted).length} remaining
                  </span>
                )}
              </div>

              {noTasks ? (
                <div className="py-8 text-center">
                  <Sparkles size={28} className="text-accent-green mx-auto mb-3" />
                  <p className="text-sm text-muted">All clear — nothing due today</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {tasksOverdue.length > 0 && (
                    <p className="text-xs uppercase tracking-wider font-bold text-red-500 mb-2">Overdue</p>
                  )}
                  {tasksOverdue.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      overdue
                      onComplete={(id) => completeTaskMutation.mutate(id)}
                    />
                  ))}
                  {tasksOverdue.length > 0 && tasksDue.length > 0 && (
                    <p className="text-xs uppercase tracking-wider font-bold text-muted mb-2 pt-3">Due today</p>
                  )}
                  {tasksDue.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onComplete={(id) => completeTaskMutation.mutate(id)}
                    />
                  ))}
                </div>
              )}

              <Link href="/tasks" className="text-sm text-accent-blue hover:underline mt-4 inline-block">
                Open Tasks →
              </Link>
            </motion.div>

            {/* ── Habits ────────────────────────────────────── */}
            <motion.div variants={fadeSlideUpItem} className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-wider font-bold text-muted flex items-center gap-1.5">
                  <Activity size={14} /> Habits
                </h2>
                {habits.length > 0 && (
                  <span className="text-xs text-muted">
                    {habits.filter((h) => (h.todayCount || 0) >= (h.targetCount || 1)).length}/{habits.length} done
                  </span>
                )}
              </div>

              {habits.length === 0 ? (
                <div className="py-8 text-center">
                  <Activity size={28} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">No habits yet — build one small routine.</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {habits.map((habit) => {
                    const todayCount = habit.todayCount || 0;
                    const targetCount = habit.targetCount || 1;
                    const isComplete = todayCount >= targetCount;
                    const progress = Math.min(1, todayCount / targetCount);
                    return (
                      <div
                        key={habit.id}
                        className={`flex items-center gap-3 py-2 transition-opacity ${isComplete ? 'opacity-60' : ''}`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: habit.color || 'var(--accent-green)' }}
                        />
                        <span className="flex-1 text-sm font-medium text-foreground truncate">{habit.name}</span>
                        <span className="flex items-center gap-1 text-xs text-orange-500 shrink-0">
                          <Flame size={14} /> {habit.currentStreak}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.9 }}
                          onClick={() => {
                            if (!isComplete && !logHabitMutation.isPending) logHabitMutation.mutate(habit.id);
                          }}
                          disabled={isComplete}
                          className="relative w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer disabled:cursor-default"
                          aria-label={`Log ${habit.name}`}
                        >
                          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                            <circle cx="18" cy="18" r={RING_RADIUS} className="stroke-surface-hover fill-none" strokeWidth="3" />
                            <circle
                              cx="18"
                              cy="18"
                              r={RING_RADIUS}
                              className={`fill-none transition-all duration-500 ease-out ${isComplete ? 'stroke-accent-green' : 'stroke-accent-blue'}`}
                              strokeWidth="3"
                              strokeLinecap="round"
                              strokeDasharray={RING_CIRCUMFERENCE}
                              strokeDashoffset={RING_CIRCUMFERENCE * (1 - progress)}
                            />
                          </svg>
                          <span className="absolute inset-0 flex items-center justify-center">
                            {logHabitMutation.isPending && logHabitMutation.variables === habit.id ? (
                              <Loader2 size={12} className="animate-spin text-muted" />
                            ) : isComplete ? (
                              <motion.span
                                initial={{ scale: 0.5, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ duration: 0.15 }}
                                className="flex"
                              >
                                <Check size={14} className="text-accent-green" />
                              </motion.span>
                            ) : targetCount > 1 ? (
                              <span className="text-[8px] font-semibold text-muted">
                                {todayCount}/{targetCount}
                              </span>
                            ) : (
                              <Check size={14} className="text-muted" />
                            )}
                          </span>
                        </motion.button>
                      </div>
                    );
                  })}
                </div>
              )}

              <Link href="/habits" className="text-sm text-accent-blue hover:underline mt-4 inline-block">
                Open Habits →
              </Link>
            </motion.div>

            {/* ── Schedule ──────────────────────────────────── */}
            <motion.div variants={fadeSlideUpItem} className="bg-surface border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs uppercase tracking-wider font-bold text-muted flex items-center gap-1.5">
                  <CalendarIcon size={14} /> Schedule
                </h2>
                {events.length > 0 && <span className="text-xs text-muted">{events.length} today</span>}
              </div>

              {events.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarIcon size={28} className="text-muted/30 mx-auto mb-3" />
                  <p className="text-sm text-muted">No events today</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {events.map((event) => (
                    <div key={event.id} className="flex items-center gap-3 py-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: event.color || 'var(--accent-blue)' }}
                      />
                      <span className="flex-1 text-sm font-medium text-foreground truncate">{event.title}</span>
                      <span className="text-xs text-muted shrink-0">
                        {event.isAllDay
                          ? 'All day'
                          : `${formatEventTime(event.startTime)} – ${formatEventTime(event.endTime)}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <Link href="/calendar" className="text-sm text-accent-blue hover:underline mt-4 inline-block">
                Open Calendar →
              </Link>
            </motion.div>

            {/* ── Focus & Journal ───────────────────────────── */}
            <motion.div variants={fadeSlideUpItem} className="bg-surface border border-border rounded-xl p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 h-full">
                <div className="flex flex-col">
                  <h2 className="text-xs uppercase tracking-wider font-bold text-muted flex items-center gap-1.5 mb-4">
                    <Timer size={14} /> Focus
                  </h2>
                  <p className="text-3xl font-bold text-foreground">
                    {today?.focus.minutesToday ?? 0}
                    <span className="text-sm font-normal text-muted"> min</span>
                  </p>
                  <p className="text-xs text-muted mt-1">{today?.focus.sessionsToday ?? 0} sessions today</p>
                  <Link
                    href="/focus"
                    className="text-sm text-accent-blue hover:underline mt-auto pt-4 inline-block"
                  >
                    Start focus session →
                  </Link>
                </div>

                <div className="flex flex-col border-t sm:border-t-0 sm:border-l border-border pt-6 sm:pt-0 sm:pl-6">
                  <h2 className="text-xs uppercase tracking-wider font-bold text-muted flex items-center gap-1.5 mb-4">
                    <BookOpen size={14} /> Journal
                  </h2>
                  {today?.journal.hasEntryToday ? (
                    <>
                      <p className="text-sm text-foreground flex items-center gap-2">
                        {journalMood && <journalMood.icon size={20} className="text-accent-blue" />}
                        {journalMood ? `Feeling ${journalMood.label.toLowerCase()}` : 'Entry logged'}
                      </p>
                      <p className="text-xs text-muted mt-1">Today's entry is in.</p>
                      <Link
                        href="/journal"
                        className="text-sm text-accent-blue hover:underline mt-auto pt-4 inline-block"
                      >
                        Edit today's entry →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-xs text-muted mb-3">How are you feeling?</p>
                      <div className="flex items-center gap-2">
                        {MOOD_OPTIONS.map(({ value, label, icon: Icon }) => (
                          <motion.button
                            key={value}
                            whileTap={{ scale: 0.9 }}
                            whileHover={{ scale: 1.1 }}
                            onClick={() => router.push(`/journal?mood=${value}`)}
                            title={label}
                            aria-label={`Feeling ${label.toLowerCase()}`}
                            className="p-1.5 rounded-lg text-muted hover:text-accent-blue hover:bg-surface-hover transition-colors"
                          >
                            <Icon size={20} />
                          </motion.button>
                        ))}
                      </div>
                      <p className="text-xs text-muted mt-auto pt-4">Pick a mood to start today's entry.</p>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

// ── Task row with animated completion ────────────────────────
function TaskRow({
  task,
  overdue,
  onComplete,
}: {
  task: TodayTask;
  overdue?: boolean;
  onComplete: (id: string) => void;
}) {
  const done = task.isCompleted;
  return (
    <div className={`flex items-center gap-3 py-2 transition-opacity ${done ? 'opacity-60' : ''}`}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => !done && onComplete(task.id)}
        disabled={done}
        aria-label={done ? 'Completed' : `Complete ${task.title}`}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
          done ? 'border-accent-green bg-accent-green' : 'border-border hover:border-accent-green'
        }`}
      >
        {done && (
          <motion.span
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
            className="flex"
          >
            <Check size={12} className="text-white" />
          </motion.span>
        )}
      </motion.button>
      <span
        className={`flex-1 text-sm truncate transition-colors ${
          done ? 'line-through text-muted' : 'text-foreground font-medium'
        }`}
      >
        {task.title}
      </span>
      {overdue && task.dueDate && (
        <span className="text-xs text-red-500 shrink-0">
          {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </span>
      )}
    </div>
  );
}

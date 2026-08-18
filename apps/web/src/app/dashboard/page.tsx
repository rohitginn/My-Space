'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar,
  CheckSquare, 
  Plus, 
  Loader2, 
  Activity, 
  Check, 
  User, 
  Flame, 
  Timer, 
  Laugh, 
  Smile, 
  Meh, 
  Frown, 
  CloudRain, 
  Inbox, 
  ArrowRight,
  Sparkles,
  BookOpen,
  Award
} from 'lucide-react';
import {
  InboxIcon,
  FocusIcon,
  CalendarIcon,
  ProjectsIcon,
  HabitsIcon,
  GoalsIcon,
  NotesIcon
} from '@/components/AnimatedSidebarIcons';
import {
  MoodGreatIcon,
  MoodGoodIcon,
  MoodOkayIcon,
  MoodLowIcon,
  MoodRoughIcon
} from '@/components/AnimatedMoodIcons';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/components/AuthProvider';
import api from '@/lib/api';
import { QuickCapture } from '@/components/QuickCapture';
import { fadeSlideUp, fadeSlideUpItem, staggerParent, pressTap } from '@/lib/motion';

type Mood = 'great' | 'good' | 'okay' | 'low' | 'rough';

const MOOD_OPTIONS = [
  { value: 'great', label: 'Great', icon: MoodGreatIcon, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
  { value: 'good', label: 'Good', icon: MoodGoodIcon, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { value: 'okay', label: 'Okay', icon: MoodOkayIcon, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { value: 'low', label: 'Low', icon: MoodLowIcon, color: 'text-orange-500', bg: 'bg-orange-500/10' },
  { value: 'rough', label: 'Rough', icon: MoodRoughIcon, color: 'text-rose-500', bg: 'bg-rose-500/10' },
] as const;


export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [journalText, setJournalText] = useState('');
  const [selectedMood, setSelectedMood] = useState<Mood | null>(null);
  const [hoveredMood, setHoveredMood] = useState<Mood | null>(null);


  // 1. Fetch Today's Comprehensive Summary Data
  const { data: todayData, isLoading: isLoadingToday } = useQuery({
    queryKey: ['today'],
    queryFn: async () => {
      const { data } = await api.get('/today');
      return data.data;
    }
  });

  // 2. Fetch Inbox items count
  const { data: inboxItems } = useQuery({
    queryKey: ['inbox'],
    queryFn: async () => {
      const { data } = await api.get('/inbox');
      return data.data as any[];
    }
  });

  // 3. Fetch Routines (for active templates progress)
  const { data: routines } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data } = await api.get('/habits/routines');
      return data.data as any[];
    }
  });

  // 4. Fetch First Kanban Board for Preview
  const { data: boardsData } = useQuery({
    queryKey: ['kanban', 'boards'],
    queryFn: async () => {
      const { data } = await api.get('/kanban/boards');
      return data.data as any[];
    }
  });

  const firstBoardId = boardsData?.[0]?.id;

  const { data: boardData } = useQuery({
    queryKey: ['kanban', 'boards', firstBoardId],
    queryFn: async () => {
      if (!firstBoardId) return null;
      const { data } = await api.get(`/kanban/boards/${firstBoardId}`);
      return data.data;
    },
    enabled: !!firstBoardId
  });

  // Mutations
  const logHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/habits/${id}/log`, { logDate: new Date().toISOString() });
      return data.data;
    },
    onSuccess: () => {
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });

  const saveJournalMutation = useMutation({
    mutationFn: async (vars: { mood: Mood; content: string }) => {
      const todayStr = new Date().toISOString().split('T')[0];
      const { data } = await api.post('/journal', {
        entryDate: todayStr,
        title: 'Daily Log',
        content: vars.content,
        mood: vars.mood
      });
      return data.data;
    },
    onSuccess: () => {
      confetti({
        particleCount: 120,
        spread: 90,
        origin: { y: 0.6 }
      });
      setSelectedMood(null);
      setJournalText('');
      queryClient.invalidateQueries({ queryKey: ['today'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
    }
  });

  if (isLoadingToday) {
    return (
      <div className="p-8 h-full flex items-center justify-center text-muted">
        <Loader2 className="animate-spin mr-3" /> Preparing your dashboard...
      </div>
    );
  }

  const level = todayData?.user?.level ?? user?.level ?? 1;
  const xp = todayData?.user?.xp ?? user?.xp ?? 0;
  const streak = todayData?.user?.currentStreak ?? user?.currentStreak ?? 0;
  const activeTemplate = routines?.find(r => r.isActive);
  const pendingInboxCount = inboxItems?.filter(i => !i.isProcessed).length ?? 0;

  // Calculate active template progress
  let totalTemplateDays = 0;
  let templateDaysPassed = 0;
  let templateProgressPercent = 0;
  if (activeTemplate) {
    if (activeTemplate.durationType === 'days') totalTemplateDays = activeTemplate.durationValue;
    else if (activeTemplate.durationType === 'weeks') totalTemplateDays = activeTemplate.durationValue * 7;
    else if (activeTemplate.durationType === 'months') totalTemplateDays = activeTemplate.durationValue * 30;

    templateDaysPassed = activeTemplate.startDate
      ? Math.max(0, Math.min(totalTemplateDays, Math.ceil((new Date().getTime() - new Date(activeTemplate.startDate).getTime()) / (1000 * 60 * 60 * 24))))
      : 0;
    templateProgressPercent = totalTemplateDays > 0 ? Math.round((templateDaysPassed / totalTemplateDays) * 100) : 0;
  }

  return (
    <motion.div 
      variants={staggerParent}
      initial="initial"
      animate="animate"
      className="w-full max-w-6xl mx-auto overflow-y-auto p-4 sm:p-8"
    >
      {/* Header Panel */}
      <motion.header variants={fadeSlideUpItem} className="mb-10 mt-4 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight">
            Welcome back, {user?.displayName?.split(' ')[0] || 'Friend'} 👋
          </h1>
          <p className="text-muted mt-1.5 text-sm">
            Here's your cockpit overview for {new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}
          </p>
        </div>
        
        {/* User stats overview */}
        <div className="flex items-center gap-3 bg-surface/40 glass border border-border/80 px-4 py-3 rounded-2xl">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 justify-between mb-1">
              <span className="text-xs font-bold text-foreground">Level {level}</span>
              <span className="text-[10px] text-muted font-medium">{xp % 100} / 100 XP</span>
            </div>
            <div className="h-1.5 w-32 bg-surface border border-border/50 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-accent-blue to-accent-green" style={{ width: `${xp % 100}%` }}></div>
            </div>
          </div>
          <div className="w-px h-8 bg-border/60 mx-1"></div>
          <div className="flex items-center gap-1 text-orange-500 font-bold text-sm">
            <Flame size={18} className="fill-current" />
            <span>{streak}d Streak</span>
          </div>
        </div>
      </motion.header>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Left Column: Quick Capture & Inbox */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Quick Capture Input */}
          <motion.section 
            variants={fadeSlideUpItem} 
            className="bg-surface/30 glass border border-border p-6 rounded-2xl"
          >
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Inbox size={16} className="text-accent-blue" />
              Capture thoughts
            </h2>
            <QuickCapture placeholder="Have a thought? Dump it here, triage it in Inbox..." />
            {pendingInboxCount > 0 && (
              <div className="flex justify-between items-center mt-4 pt-3 border-t border-border/40 text-xs">
                <span className="text-muted font-medium">📥 {pendingInboxCount} captured items waiting in Triage</span>
                <a href="/inbox" className="text-accent-blue hover:underline font-bold flex items-center gap-1">
                  Go to Triage <ArrowRight size={12} />
                </a>
              </div>
            )}
          </motion.section>

          {/* Daily Mood & Reflection widget */}
          <motion.section 
            variants={fadeSlideUpItem} 
            className="bg-surface/30 glass border border-border p-6 rounded-2xl"
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                <BookOpen size={16} className="text-accent-green" />
                Mood & reflection
              </h2>

              {todayData?.journal?.hasEntryToday && (
                <span className="text-xs text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full font-bold">
                  Logged
                </span>
              )}
            </div>

            {todayData?.journal?.hasEntryToday ? (
              <div className="bg-surface/50 border border-border rounded-xl p-4 flex items-center gap-4">
                <div className="p-3 bg-accent-green/10 rounded-xl text-accent-green">
                  <Smile size={24} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">You logged your reflection today!</p>
                  <p className="text-xs text-muted mt-1">Keep it up! Each daily log makes your insights stronger.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted">How are you feeling today?</p>
                <div className="flex gap-2">
                  {MOOD_OPTIONS.map((mood) => {
                    const Icon = mood.icon;
                    const isSelected = selectedMood === mood.value;
                    const isHovered = hoveredMood === mood.value;
                    
                    return (
                      <button
                        key={mood.value}
                        onClick={() => setSelectedMood(mood.value)}
                        onMouseEnter={() => setHoveredMood(mood.value)}
                        onMouseLeave={() => setHoveredMood(null)}
                        className={`flex-1 py-3 px-2 rounded-xl border flex flex-col items-center gap-1.5 transition-all duration-200 ${
                          isSelected 
                            ? `${mood.bg} ${mood.color} border-current font-bold scale-105 shadow-sm` 
                            : 'bg-surface border-border text-muted hover:text-foreground hover:bg-surface-hover'
                        }`}
                      >
                        <div className={isSelected || isHovered ? mood.color : 'text-muted'}>
                          <Icon isHovered={isHovered} isSelected={isSelected} />
                        </div>
                        <span className="text-[10px] font-medium">{mood.label}</span>
                      </button>
                    );
                  })}
                </div>

                <AnimatePresence>
                  {selectedMood && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="space-y-3 pt-2"
                    >
                      <textarea
                        value={journalText}
                        onChange={(e) => setJournalText(e.target.value)}
                        placeholder="Add a quick note or reflection about your day... (Optional)"
                        className="w-full bg-surface border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:border-accent-green focus:outline-none resize-none h-18"
                      />
                      <div className="flex justify-end">
                        <button
                          onClick={() => saveJournalMutation.mutate({ mood: selectedMood, content: journalText })}
                          disabled={saveJournalMutation.isPending}
                          className="bg-accent-green hover:bg-accent-green-hover text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                        >
                          {saveJournalMutation.isPending ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Log Mood
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </motion.section>

          {/* Active Template Progress Widget */}
          {activeTemplate && (
            <motion.section 
              variants={fadeSlideUpItem} 
              className="bg-surface/30 glass border border-border p-6 rounded-2xl"
            >
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Award size={16} className="text-amber-500" />
                Active template tracker
              </h2>
              <div className="border border-border/80 rounded-xl p-4 bg-surface/20">
                <div className="flex justify-between items-start gap-4 mb-3">
                  <div>
                    <h3 className="font-bold text-foreground text-sm">{activeTemplate.name}</h3>
                    <p className="text-xs text-muted mt-0.5">Duration: {activeTemplate.durationValue} {activeTemplate.durationType}</p>
                  </div>
                  <span className="text-[10px] font-bold text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full">
                    Day {templateDaysPassed} of {totalTemplateDays}
                  </span>
                </div>
                
                {activeTemplate.purpose && (
                  <p className="text-xs text-foreground/90 italic font-medium bg-surface/50 border border-border px-3 py-2 rounded-lg mb-4">
                    "{activeTemplate.purpose}"
                  </p>
                )}

                <div className="flex justify-between text-[10px] font-bold text-muted mb-1">
                  <span>Goal Completion Progress</span>
                  <span>{templateProgressPercent}%</span>
                </div>
                <div className="h-2 w-full bg-surface border border-border/50 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-accent-blue to-accent-green" style={{ width: `${templateProgressPercent}%` }}></div>
                </div>
              </div>
            </motion.section>
          )}
        </div>

        {/* Right Column: Focus Stats, Habits checklist, and Calendar */}
        <div className="flex flex-col gap-6">
          {/* Focus Stats Widget */}
          <motion.section 
            variants={fadeSlideUpItem} 
            className="bg-surface/30 glass border border-border p-6 rounded-2xl"
          >
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <Timer size={16} className="text-accent-blue" />
              Focus Room
            </h2>
            <div className="flex justify-between items-center gap-4">
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{todayData?.focus?.minutesToday ?? 0}m</span>
                <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Minutes Today</span>
              </div>
              <div className="w-px h-8 bg-border"></div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-foreground">{todayData?.focus?.sessionsToday ?? 0}</span>
                <span className="text-[10px] text-muted font-medium uppercase tracking-wider">Sessions Today</span>
              </div>
              <a 
                href="/focus" 
                className="bg-accent-blue/10 hover:bg-accent-blue/20 text-accent-blue p-2.5 rounded-xl transition-colors ml-auto"
                title="Go to Focus Room"
              >
                <ArrowRight size={16} />
              </a>
            </div>
          </motion.section>

          {/* Today's Habits Checklist */}
          <motion.section 
            variants={fadeSlideUpItem} 
            className="bg-surface/30 glass border border-border p-6 rounded-2xl flex-1 flex flex-col justify-between"
          >
            <div>
              <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                <Activity size={16} className="text-accent-green" />
                Today's Habits
              </h2>

              
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {!todayData?.habits || todayData.habits.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted text-xs">
                    No habits set up yet.
                  </div>
                ) : (
                  todayData.habits.map((habit: any) => {
                    const todayCount = habit.todayCount || 0;
                    const targetCount = habit.targetCount || 1;
                    const isCompleted = todayCount >= targetCount;
                    const percent = Math.min(100, Math.round((todayCount / targetCount) * 100));

                    return (
                      <div key={habit.id} className="bg-surface rounded-xl p-3 border border-border/80 flex justify-between items-center relative overflow-hidden group">
                        <div className="absolute left-0 top-0 bottom-0 bg-accent-green/5 transition-all duration-300 z-0" style={{ width: `${percent}%` }}></div>
                        <div className="flex items-center gap-2.5 z-10">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: habit.color || '#3b82f6' }} />
                          <div className="flex flex-col">
                            <span className={`text-xs font-semibold ${isCompleted ? 'text-muted line-through' : 'text-foreground'}`}>
                              {habit.name}
                            </span>
                            {targetCount > 1 && (
                              <span className="text-[9px] text-muted font-medium">{todayCount} / {targetCount}</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => logHabitMutation.mutate(habit.id)}
                          disabled={isCompleted || logHabitMutation.isPending}
                          className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 z-10 transition-all ${
                            isCompleted 
                              ? 'bg-accent-green text-white shadow-sm' 
                              : 'bg-surface-hover hover:bg-accent-green/20 hover:text-accent-green border border-border text-muted'
                          }`}
                        >
                          {logHabitMutation.isPending && logHabitMutation.variables === habit.id ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
            
            <a 
              href="/habits" 
              className="w-full text-center py-2 text-xs font-bold text-accent-green border border-accent-green/20 bg-accent-green/5 hover:bg-accent-green/10 rounded-xl block mt-4 transition-all"
            >
              Configure Templates & Habits
            </a>
          </motion.section>

          {/* Today's Schedule */}
          <motion.section 
            variants={fadeSlideUpItem} 
            className="bg-surface/30 glass border border-border p-6 rounded-2xl"
          >
            <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
              <Calendar size={16} className="text-accent-blue" />
              Schedule
            </h2>
            <div className="space-y-3.5 max-h-48 overflow-y-auto pr-1">
              {!todayData?.events || todayData.events.length === 0 ? (
                <div className="border border-dashed border-border rounded-xl p-6 text-center text-muted text-xs">
                  Free schedule today!
                </div>
              ) : (
                todayData.events.map((event: any) => (
                  <div key={event.id} className="flex gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }} />
                    <div>
                      <p className="text-[10px] text-muted font-semibold">
                        {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startTime))}
                      </p>
                      <p className="text-xs font-medium text-foreground">{event.title}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.section>
        </div>
      </div>

      {/* Project Board Preview */}
      {boardData && (
        <motion.section 
          variants={fadeSlideUpItem} 
          className="bg-surface/30 glass border border-border p-6 rounded-2xl"
        >
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
            <CheckSquare size={16} className="text-accent-blue" />
            Project Board Preview: {boardData.title}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boardData.columns?.slice(0, 3).map((col: any) => (
              <div key={col.id} className="bg-surface rounded-xl p-4 border border-border/80">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
                    {col.title}
                  </h3>
                  <span className="text-[10px] font-bold text-muted bg-surface-hover px-1.5 py-0.5 rounded-md">
                    {col.cards?.length || 0}
                  </span>
                </div>
                
                {col.cards?.length === 0 ? (
                  <p className="text-[10px] text-muted">No cards in this column.</p>
                ) : (
                  <div className="space-y-2">
                    {col.cards.slice(0, 2).map((card: any) => (
                      <div key={card.id} className="bg-background rounded-lg p-2.5 border border-border shadow-sm truncate text-xs font-medium text-foreground">
                        {card.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </motion.section>
      )}
    </motion.div>
  );
}

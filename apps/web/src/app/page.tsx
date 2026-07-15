'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar as CalendarIcon, CheckSquare, Plus, Loader2, Activity, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/components/AuthProvider';
import api from '@/lib/api';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0, 
    transition: { 
      type: "spring", 
      stiffness: 100, 
      damping: 15 
    } 
  }
} as const;

export default function Home() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [quickNote, setQuickNote] = useState('');

  // 1. Fetch Calendar Events for Today
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
  
  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['calendar', 'events', 'today'],
    queryFn: async () => {
      const { data } = await api.get(`/calendar/events?start=${startOfDay}&end=${endOfDay}`);
      return data.data as any[];
    }
  });

  // 2. Fetch First Kanban Board for Preview
  const { data: boardsData, isLoading: isLoadingBoards } = useQuery({
    queryKey: ['kanban', 'boards'],
    queryFn: async () => {
      const { data } = await api.get('/kanban/boards');
      return data.data as any[];
    }
  });

  const firstBoardId = boardsData?.[0]?.id;

  const { data: boardData, isLoading: isLoadingBoard } = useQuery({
    queryKey: ['kanban', 'boards', firstBoardId],
    queryFn: async () => {
      if (!firstBoardId) return null;
      const { data } = await api.get(`/kanban/boards/${firstBoardId}`);
      return data.data;
    },
    enabled: !!firstBoardId
  });

  // 3. Quick Add Note Mutation
  const addNoteMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/notes', { 
        title: 'Quick Note', 
        content: quickNote 
      });
      return data.data;
    },
    onSuccess: () => {
      setQuickNote('');
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  const handleAddNote = () => {
    if (quickNote.trim()) {
      addNoteMutation.mutate();
    }
  };

  // 4. Fetch Habits
  const { data: habitsData, isLoading: isLoadingHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data } = await api.get('/habits');
      return data.data as any[];
    }
  });

  const logHabitMutation = useMutation({
    mutationFn: async (vars: { id: string, logDate: string }) => {
      const { data } = await api.post(`/habits/${vars.id}/log`, { date: vars.logDate });
      return data.data;
    },
    onSuccess: () => {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#3b82f6', '#10b981', '#f59e0b']
      });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  const todayStr = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' }).format(today);

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="p-8 max-w-6xl mx-auto w-full overflow-y-auto"
    >
      <motion.header variants={itemVariants} className="mb-12 mt-4">
        <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
          {getGreeting()}, {user?.displayName?.split(' ')[0] || 'Friend'} 👋
        </h1>
        <p className="text-muted mt-2 text-lg">Ready to achieve your goals today?</p>
        <p className="text-sm text-muted mt-1">{todayStr}</p>
      </motion.header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        {/* Streak and Calendar Wrapper */}
        <motion.div variants={itemVariants} className="flex flex-col gap-6">
          {/* Daily Streak Widget */}
          <motion.section variants={itemVariants} className="glass rounded-2xl p-6 relative overflow-hidden group bg-gradient-to-br from-amber-500/20 to-amber-500/5 border-amber-500/30">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                🔥 App Streak
              </h2>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-bold text-foreground">{user?.currentStreak || 0}</span>
              <span className="text-muted font-medium">days</span>
            </div>
            <p className="text-xs text-muted mt-2">Log in daily to keep the streak alive!</p>
          </motion.section>

          {/* Calendar Widget */}
          <motion.section variants={itemVariants} className="glass rounded-2xl p-6 relative overflow-hidden group flex-1">
            <div className="absolute top-0 right-0 w-32 h-32 bg-accent-blue/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
            
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <CalendarIcon size={20} className="text-accent-blue" />
                Today's Schedule
              </h2>
            </div>
            
            <div className="flex flex-col">
              {isLoadingEvents ? (
                <div className="flex items-center justify-center p-8 text-muted">
                  <Loader2 className="animate-spin mr-2" size={20} /> Loading events...
                </div>
              ) : !eventsData || eventsData.length === 0 ? (
                <div className="bg-surface/50 border border-dashed border-border rounded-xl p-8 text-center text-muted">
                  No events scheduled for today. You're free!
                </div>
              ) : (
                <div className="space-y-4">
                  {eventsData.map(event => (
                    <div key={event.id} className="flex gap-3">
                      <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: event.color || '#3b82f6' }}></div>
                      <div>
                        <p className="text-xs text-muted">
                          {new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startTime))}
                        </p>
                        <p className="text-sm font-medium text-foreground">{event.title}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.section>
        </motion.div>

        {/* Quick Add Note */}
        <motion.section variants={itemVariants} className="glass rounded-2xl p-6 flex flex-col relative overflow-hidden">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-foreground">Quick Note</h2>
          </div>
          <div className="flex-1 bg-surface rounded-xl p-4 border border-border flex flex-col focus-within:border-accent-green/50 focus-within:ring-1 focus-within:ring-accent-green/50 transition-all">
            <textarea 
              value={quickNote}
              onChange={(e) => setQuickNote(e.target.value)}
              placeholder="Capture a quick thought..." 
              className="w-full flex-1 bg-transparent border-none outline-none resize-none text-foreground placeholder:text-muted/60"
            ></textarea>
            <div className="flex justify-end mt-2">
              <button 
                onClick={handleAddNote}
                disabled={addNoteMutation.isPending || !quickNote.trim()}
                className="w-10 h-10 rounded-xl bg-accent-green hover:bg-accent-green-hover text-white flex items-center justify-center transition-colors shadow-lg shadow-accent-green/20 disabled:opacity-50"
              >
                {addNoteMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <Plus size={20} />}
              </button>
            </div>
          </div>
        </motion.section>

        {/* Today's Habits Widget */}
        <motion.section variants={itemVariants} className="glass rounded-2xl p-6 relative overflow-hidden group">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Activity size={20} className="text-accent-green" />
              Today's Habits
            </h2>
          </div>
          
          <div className="flex flex-col space-y-3">
            {isLoadingHabits ? (
              <div className="flex items-center justify-center p-8 text-muted">
                <Loader2 className="animate-spin mr-2" size={20} /> Loading habits...
              </div>
            ) : !habitsData || habitsData.length === 0 ? (
              <div className="bg-surface/50 border border-dashed border-border rounded-xl p-8 text-center text-muted">
                No habits set up yet.
              </div>
            ) : (
              habitsData.map(habit => {
                const todayCount = habit.todayCount || 0;
                const targetCount = habit.targetCount || 1;
                const isCompletedToday = todayCount >= targetCount;
                const progressPercent = Math.min(100, Math.round((todayCount / targetCount) * 100));
                
                return (
                  <div key={habit.id} className="bg-surface rounded-xl p-3 border border-border flex justify-between items-center relative overflow-hidden">
                    {/* Progress Background */}
                    <div className="absolute left-0 top-0 bottom-0 bg-accent-green/5 transition-all duration-500 ease-out z-0" style={{ width: `${progressPercent}%` }}></div>
                    
                    <div className="flex items-center gap-3 z-10">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: habit.color || '#3b82f6' }}></div>
                      <div className="flex flex-col">
                        <span className={`text-sm font-medium ${isCompletedToday ? 'text-muted line-through' : 'text-foreground'}`}>
                          {habit.name}
                        </span>
                        {targetCount > 1 && (
                          <span className="text-[10px] text-muted font-medium">
                            {todayCount} / {targetCount}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => logHabitMutation.mutate({ id: habit.id, logDate: new Date().toISOString() })}
                      disabled={isCompletedToday || logHabitMutation.isPending}
                      className={`w-8 h-8 rounded-full flex items-center shrink-0 justify-center transition-all z-10 ${isCompletedToday ? 'bg-accent-green text-white shadow-md' : 'bg-surface-hover text-muted hover:bg-accent-green/20 hover:text-accent-green border border-border'}`}
                    >
                      {logHabitMutation.isPending && logHabitMutation.variables?.id === habit.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Check size={14} className={isCompletedToday ? "scale-110" : ""} />
                      )}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </motion.section>
      </div>

      {/* Kanban Preview */}
      <motion.section variants={itemVariants} className="glass rounded-2xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <CheckSquare size={20} className="text-accent-blue" />
            Project Preview
            {boardData && <span className="text-muted text-sm font-normal ml-2">- {boardData.title}</span>}
          </h2>
        </div>
        
        {isLoadingBoards || isLoadingBoard ? (
          <div className="flex items-center justify-center p-12 text-muted">
            <Loader2 className="animate-spin mr-2" size={24} /> Loading project data...
          </div>
        ) : !boardData || boardData.columns?.length === 0 ? (
          <div className="bg-surface/50 border border-dashed border-border rounded-xl p-12 text-center text-muted">
            No projects set up yet. Head over to the Projects tab to create one!
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {boardData.columns.slice(0, 3).map((column: any) => (
              <div key={column.id} className="bg-surface/50 rounded-xl p-4 border border-border">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium text-foreground flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: column.color }}></div>
                    {column.title}
                  </h3>
                  <span className="text-xs bg-surface border border-border px-2 py-1 rounded-md text-muted">{column.cards?.length || 0}</span>
                </div>
                
                {column.cards?.length === 0 ? (
                  <p className="text-xs text-muted">No cards here.</p>
                ) : (
                  <div className="space-y-3">
                    {column.cards.slice(0, 3).map((card: any) => (
                      <div key={card.id} className="bg-background rounded-lg p-3 border border-border shadow-sm truncate">
                        <h4 className="text-sm font-medium text-foreground mb-1 truncate">{card.title}</h4>
                        {card.tag && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium uppercase" style={{ color: card.tagColor || '#6366f1', backgroundColor: `${card.tagColor || '#6366f1'}20` }}>
                            {card.tag}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </motion.section>
    </motion.div>
  );
}

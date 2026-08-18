// ============================================================
// Habits Tracker & Achievements Center
// ============================================================

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Loader2, Activity, Trash2, TrendingUp, Award, Play, PieChart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';

function Heatmap({ history, targetCount }: { history: Record<string, number>, targetCount: number }) {
  const days = [];
  const today = new Date();
  
  // Last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    const count = history[dateStr] || 0;
    
    let colorClass = 'bg-surface border border-border';
    if (count >= targetCount) {
      colorClass = 'bg-accent-green text-white border-accent-green';
    } else if (count > 0) {
      colorClass = 'bg-accent-green/30 border-accent-green/50';
    }
    
    days.push(
      <div 
        key={dateStr} 
        title={`${dateStr}: ${count} / ${targetCount}`}
        className={`w-5 h-5 rounded-sm ${colorClass} transition-colors`}
      />
    );
  }

  return (
    <div className="flex flex-wrap gap-1 mt-4">
      {days}
    </div>
  );
}

const ALL_BADGES = [
  { type: 'focus_10', title: 'Focus Rookie', description: 'Spend 10 total minutes focusing in the Focus Room.', iconUrl: '/images/badges/focus_10.png' },
  { type: 'focus_100', title: 'Deep Work Guru', description: 'Spend 100 total minutes focusing in the Focus Room.', iconUrl: '/images/badges/focus_100.png' },
  { type: 'streak_3', title: 'Streak Starter', description: 'Maintain a 3-day habit streak.', iconUrl: '/images/badges/streak_3.png' },
  { type: 'streak_10', title: 'Consistency Champion', description: 'Maintain a 10-day habit streak.', iconUrl: '/images/badges/streak_10.png' },
  { type: 'goal_1', title: 'Goal Getter', description: 'Complete your first personal goal.', iconUrl: '/images/badges/goal_1.png' },
  { type: 'task_10', title: 'Task Crusher', description: 'Complete 10 tasks in your space.', iconUrl: '/images/badges/task_10.png' },
];

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const { confirm, alert } = useDialog();
  const [activeTab, setActiveTab] = useState<'habits' | 'badges' | 'analytics'>('habits');
  const [modalOpen, setModalOpen] = useState(false);
  const [routineModalOpen, setRoutineModalOpen] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  
  // Custom habit and routines state
  const [newHabit, setNewHabit] = useState({ name: '', color: '#10b981', frequency: 'daily', targetCount: 1 });
  const [newRoutine, setNewRoutine] = useState({ name: '', description: '', purpose: '', durationType: 'weeks', durationValue: 4, habits: [] as any[] });
  const [tempHabit, setTempHabit] = useState({ name: '', color: '#3b82f6', frequency: 'daily', targetCount: 1 });

  // ── Queries ────────────────────────────────────────────────
  const { data: habitsData, isLoading: isLoadingHabits } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data } = await api.get('/habits');
      return data.data as any[];
    }
  });

  const { data: routinesData, isLoading: isLoadingRoutines } = useQuery({
    queryKey: ['routines'],
    queryFn: async () => {
      const { data } = await api.get('/habits/routines');
      return data.data as any[];
    }
  });

  const { data: badgesData, isLoading: isLoadingBadges } = useQuery({
    queryKey: ['badges'],
    queryFn: async () => {
      const { data } = await api.get('/users/me/badges');
      return data.data as any[];
    }
  });

  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ['habits', selectedHabitId, 'stats'],
    queryFn: async () => {
      const { data } = await api.get(`/habits/${selectedHabitId}/stats`);
      return data.data;
    },
    enabled: !!selectedHabitId
  });

  // ── Mutations ──────────────────────────────────────────────
  const createHabitMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await api.post('/habits', vars);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      setModalOpen(false);
      setNewHabit({ name: '', color: '#10b981', frequency: 'daily', targetCount: 1 });
    }
  });

  const deleteHabitMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/habits/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const logHabitMutation = useMutation({
    mutationFn: async (vars: { id: string, logDate: string }) => {
      const { data } = await api.post(`/habits/${vars.id}/log`, { logDate: vars.logDate });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['badges'] });
    }
  });

  const createRoutineMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await api.post('/habits/routines', vars);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      setRoutineModalOpen(false);
      setNewRoutine({ name: '', description: '', purpose: '', durationType: 'weeks', durationValue: 4, habits: [] });
    }
  });

  const deleteRoutineMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/habits/routines/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      queryClient.invalidateQueries({ queryKey: ['habits'] });
    }
  });

  const applyRoutineMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.post(`/habits/routines/${id}/apply`);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habits'] });
      queryClient.invalidateQueries({ queryKey: ['routines'] });
      alert('Routine applied! Habits created in your board.');
    }
  });

  if (isLoadingHabits) {
    return <div className="p-8 h-full flex items-center justify-center text-muted"><Loader2 className="animate-spin mr-3" /> Loading Habits...</div>;
  }

  const habits = habitsData || [];
  const routines = routinesData || [];
  const unlockedBadges = badgesData || [];
  const unlockedTypes = new Set(unlockedBadges.map(b => b.type));

  return (
    <div className="flex min-h-full w-full flex-col bg-background p-4 relative overflow-y-auto sm:p-8 lg:h-full lg:overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="mb-6 flex flex-col items-start gap-4 z-10 shrink-0 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Activity className="text-accent-green" size={28} />
            Habit Tracker
          </h1>
          <p className="text-muted mt-2">Build healthy routines, apply templates, and unlock badges.</p>
        </div>
        <div className="flex w-full flex-wrap gap-2 sm:w-auto sm:gap-3">
          <button 
            onClick={() => setRoutineModalOpen(true)}
            className="border border-border hover:bg-surface-hover text-foreground px-4 py-2 rounded-xl font-medium transition-colors flex items-center gap-2"
          >
            Create Routine
          </button>
          <button 
            onClick={() => setModalOpen(true)}
            className="bg-accent-green hover:bg-accent-green-hover text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            New Habit
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex overflow-x-auto border-b border-border mb-8 z-10">
        <button
          onClick={() => setActiveTab('habits')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all ${activeTab === 'habits' ? 'border-accent-green text-accent-green' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          Daily Habits
        </button>
        <button
          onClick={() => setActiveTab('badges')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'badges' ? 'border-accent-green text-accent-green' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          <Award size={16} />
          Achievements ({unlockedBadges.length}/{ALL_BADGES.length})
        </button>
        <button
          onClick={() => setActiveTab('analytics')}
          className={`px-6 py-3 font-semibold text-sm border-b-2 transition-all flex items-center gap-2 ${activeTab === 'analytics' ? 'border-accent-green text-accent-green' : 'border-transparent text-muted hover:text-foreground'}`}
        >
          <PieChart size={16} />
          Analytics
        </button>
      </div>

      <div className="flex-1 overflow-y-auto z-10">
        <AnimatePresence mode="wait">
          {activeTab === 'habits' ? (
            <motion.div
              key="habits-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-12"
            >
              {/* Routine Templates */}
              {routines.length > 0 && (
                <div>
                  <h2 className="text-xs uppercase tracking-wider font-bold text-muted mb-4">Habit Templates & Routines</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {routines.map((routine) => {
                      const isPreset = !routine.userId || (typeof routine.id === 'string' && routine.id.startsWith('preset-'));
                      
                      // Calculate duration target in days
                      let totalDays = 0;
                      if (routine.durationValue && routine.durationType) {
                        if (routine.durationType === 'days') totalDays = routine.durationValue;
                        else if (routine.durationType === 'weeks') totalDays = routine.durationValue * 7;
                        else if (routine.durationType === 'months') totalDays = routine.durationValue * 30;
                      }
                      
                      // Calculate progress
                      const daysPassed = routine.startDate && routine.isActive
                        ? Math.max(0, Math.min(totalDays, Math.ceil((new Date().getTime() - new Date(routine.startDate).getTime()) / (1000 * 60 * 60 * 24))))
                        : 0;
                      const progressPercent = totalDays > 0 ? Math.round((daysPassed / totalDays) * 100) : 0;
                      
                      // Parse nested habits list
                      let habitsList = [];
                      try {
                        habitsList = typeof routine.habitsJson === 'string' ? JSON.parse(routine.habitsJson) : (routine.habitsJson || []);
                      } catch (e) {
                        habitsList = [];
                      }

                      return (
                        <div key={routine.id} className="bg-surface/50 glass border border-border p-5 rounded-2xl flex flex-col justify-between relative group hover:border-accent-green/30 transition-all duration-300">
                          {!isPreset && (
                            <button
                              onClick={() => {
                                if (window.confirm('Are you sure you want to delete this template?')) {
                                  deleteRoutineMutation.mutate(routine.id);
                                }
                              }}
                              className="absolute top-4 right-4 text-muted hover:text-red-500 transition-colors p-1"
                              title="Delete Template"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          <div>
                            <div className="flex justify-between items-start mb-1.5 pr-6">
                              <h3 className="font-bold text-foreground text-lg">{routine.name}</h3>
                            </div>
                            <p className="text-muted text-sm mb-3.5">{routine.description || 'Custom structured habit template.'}</p>
                            
                            {/* Why are you doing this reflection point */}
                            {routine.purpose && (
                              <div className="bg-accent-blue/5 border border-accent-blue/10 rounded-xl p-3.5 mb-4 text-xs">
                                <span className="font-bold text-accent-blue block mb-1 uppercase tracking-wider text-[10px]">Your Purpose ("Why")</span>
                                <p className="text-foreground/90 font-medium italic">"{routine.purpose}"</p>
                              </div>
                            )}

                            {/* Duration / Target Goal */}
                            {totalDays > 0 && (
                              <div className="mb-4 text-xs font-semibold text-muted flex items-center justify-between">
                                <span>Goal Duration: {routine.durationValue} {routine.durationType}</span>
                                {routine.isActive && (
                                  <span className="text-accent-green bg-accent-green/10 px-2 py-0.5 rounded-full text-[10px]">
                                    Active (Day {daysPassed}/{totalDays})
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Progress bar */}
                            {routine.isActive && totalDays > 0 && (
                              <div className="mb-4">
                                <div className="flex justify-between text-[11px] font-bold text-foreground mb-1">
                                  <span>Template Progress</span>
                                  <span>{progressPercent}%</span>
                                </div>
                                <div className="h-1.5 w-full bg-surface border border-border rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-gradient-to-r from-accent-blue to-accent-green transition-all duration-500 ease-out" 
                                    style={{ width: `${progressPercent}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            {/* Habit list preview */}
                            {habitsList.length > 0 && (
                              <div className="mb-5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-2">Habits Included</span>
                                <div className="flex flex-wrap gap-1.5">
                                  {habitsList.map((h: any, i: number) => (
                                    <span key={i} className="text-[11px] font-medium px-2 py-1 rounded-lg bg-surface border border-border flex items-center gap-1.5">
                                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: h.color || '#3b82f6' }} />
                                      {h.name}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <button
                            onClick={() => applyRoutineMutation.mutate(routine.id)}
                            disabled={applyRoutineMutation.isPending}
                            className={`w-full flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all duration-200 ${
                              routine.isActive 
                                ? 'bg-accent-green/10 hover:bg-accent-green/20 text-accent-green border border-accent-green/20' 
                                : 'bg-surface hover:bg-surface-hover border border-border text-foreground'
                            } disabled:opacity-50`}
                          >
                            <Play size={14} className="fill-current" />
                            {routine.isActive ? 'Re-Apply / Reset Habits' : 'Start Template & Apply'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}


              {/* Habits list */}
              <div>
                <h2 className="text-xs uppercase tracking-wider font-bold text-muted mb-4">Active Habits</h2>
                {habits.length === 0 ? (
                  <div className="bg-surface/50 border border-dashed border-border rounded-xl p-12 text-center text-muted flex flex-col items-center">
                    <TrendingUp size={48} className="text-muted/30 mb-4" />
                    <h3 className="text-lg font-medium text-foreground mb-1">No Habits Yet</h3>
                    <p className="mb-4">Create custom habits or apply one of the routines above to begin.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {habits.map((habit) => {
                      const todayCount = habit.todayCount || 0;
                      const targetCount = habit.targetCount || 1;
                      const isCompletedToday = todayCount >= targetCount;
                      const progressPercent = Math.min(100, Math.round((todayCount / targetCount) * 100));
                      const circumference = 2 * Math.PI * 22; // r=22
                      const offset = circumference - (progressPercent / 100) * circumference;
                      
                      return (
                        <div 
                          key={habit.id} 
                          onClick={() => setSelectedHabitId(habit.id)}
                          className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-accent-green/30 transition-all flex flex-col group relative overflow-hidden cursor-pointer"
                        >
                          <div className="absolute left-0 top-0 bottom-0 bg-accent-green/5 transition-all duration-500 ease-out z-0" style={{ width: `${progressPercent}%` }}></div>
                          
                          <button 
                            onClick={async (e) => { e.stopPropagation(); if(await confirm('Delete this habit?')) deleteHabitMutation.mutate(habit.id); }}
                            className="absolute top-4 right-4 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          >
                            <Trash2 size={16} />
                          </button>
                          <div className="flex items-center gap-3 mb-6 z-10">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: habit.color || '#10b981' }}>
                              <Activity size={20} />
                            </div>
                            <div>
                              <h3 className="font-semibold text-foreground text-lg">{habit.name}</h3>
                              <div className="text-xs text-muted flex gap-2 items-center">
                                <span className="capitalize">{habit.frequency}</span>
                                {targetCount > 1 && (
                                  <>
                                    <span>•</span>
                                    <span>Target: {targetCount}</span>
                                  </>
                                )}
                                <span>•</span>
                                <span className="flex items-center gap-1 text-orange-500"><TrendingUp size={12}/> {habit.currentStreak}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-auto pt-4 border-t border-border flex items-center justify-between z-10">
                            <div>
                              <p className="text-sm font-medium text-foreground">Today's Progress</p>
                              <p className="text-xs text-muted">
                                {isCompletedToday ? "Completed! 🎉" : targetCount > 1 ? `${todayCount} of ${targetCount} done` : "Not done yet"}
                              </p>
                            </div>
                            
                            <div className="relative w-14 h-14 flex items-center justify-center cursor-pointer" 
                                 onClick={(e) => { 
                                   e.stopPropagation(); 
                                   if (!isCompletedToday && !logHabitMutation.isPending) {
                                     logHabitMutation.mutate({ id: habit.id, logDate: new Date().toISOString() }) 
                                   }
                                 }}
                            >
                              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 52 52">
                                <circle cx="26" cy="26" r="22" className="stroke-surface-hover fill-none" strokeWidth="4" />
                                <circle 
                                  cx="26" cy="26" r="22" 
                                  className={`fill-none transition-all duration-700 ease-out ${isCompletedToday ? 'stroke-accent-green' : 'stroke-accent-blue'}`} 
                                  strokeWidth="4"
                                  strokeLinecap="round"
                                  strokeDasharray={circumference}
                                  strokeDashoffset={offset}
                                />
                              </svg>
                              <div className={`absolute inset-0 m-auto w-10 h-10 rounded-full flex items-center justify-center transition-all ${isCompletedToday ? 'bg-accent-green text-white shadow-lg shadow-accent-green/20' : 'bg-surface hover:bg-surface-hover text-muted hover:text-accent-blue'}`}>
                                {logHabitMutation.isPending && logHabitMutation.variables?.id === habit.id ? (
                                  <Loader2 size={18} className="animate-spin" />
                                ) : isCompletedToday ? (
                                  <Check size={20} className="scale-110" />
                                ) : targetCount > 1 ? (
                                  <Plus size={20} />
                                ) : (
                                  <Check size={20} />
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          ) : activeTab === 'badges' ? (
            <motion.div
              key="badges-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {ALL_BADGES.map((badge) => {
                const isUnlocked = unlockedTypes.has(badge.type);
                const unlockInfo = unlockedBadges.find(b => b.type === badge.type);

                return (
                  <div 
                    key={badge.type}
                    className={`bg-surface border p-6 rounded-2xl flex items-center gap-5 transition-all shadow-sm ${isUnlocked ? 'border-accent-green/30 bg-gradient-to-br from-surface to-accent-green/[0.02]' : 'border-border opacity-70'}`}
                  >
                    <div className="relative shrink-0 w-16 h-16 flex items-center justify-center bg-surface border border-border rounded-xl p-1.5 shadow-inner">
                      <img 
                        src={badge.iconUrl} 
                        alt={badge.title} 
                        className={`w-full h-full object-contain ${isUnlocked ? 'filter-none' : 'filter grayscale contrast-50 opacity-20'}`} 
                      />
                    </div>
                    <div>
                      <h3 className="font-bold text-foreground text-lg flex items-center gap-2">
                        {badge.title}
                        {isUnlocked && <span className="text-[10px] bg-accent-green/10 text-accent-green px-1.5 py-0.5 rounded-full font-bold">Unlocked</span>}
                      </h3>
                      <p className="text-muted text-sm mt-1">{badge.description}</p>
                      {isUnlocked && unlockInfo && (
                        <p className="text-[10px] text-muted mt-2">
                          Earned {new Date(unlockInfo.unlockedAt).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          ) : (
            <motion.div
              key="analytics-tab"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <h2 className="text-xs uppercase tracking-wider font-bold text-muted mb-4">Habit Consistency Analytics</h2>
              
              {(() => {
                if (habits.length === 0) return <div className="text-muted text-center p-8 bg-surface border border-dashed border-border rounded-xl">No habit data available for analytics. Create a habit to begin.</div>;
                
                const sorted = [...habits].sort((a, b) => (b.totalCompleted || 0) - (a.totalCompleted || 0));
                const mostDone = sorted[0];
                const leastDone = sorted[sorted.length - 1];
                const chartData = sorted.map(h => ({ name: h.name, completed: h.totalCompleted || 0, color: h.color || '#10b981' }));

                return (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-5 hover:border-accent-green/30 transition-colors">
                        <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg" style={{ backgroundColor: mostDone.color || '#10b981' }}>
                          <Activity size={24} className="mb-1" />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Most Completed</h3>
                          <p className="text-xl font-bold text-foreground">{mostDone.name}</p>
                          <p className="text-sm text-muted font-medium">{mostDone.totalCompleted || 0} times total</p>
                        </div>
                      </div>
                      <div className="bg-surface border border-border p-6 rounded-2xl flex items-center gap-5 hover:border-red-500/30 transition-colors">
                        <div className="w-16 h-16 rounded-2xl flex flex-col items-center justify-center text-white shadow-lg opacity-80 grayscale-[30%]" style={{ backgroundColor: leastDone.color || '#ef4444' }}>
                          <TrendingUp size={24} className="mb-1 rotate-180" />
                        </div>
                        <div>
                          <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-1">Needs Attention</h3>
                          <p className="text-xl font-bold text-foreground">{leastDone.name}</p>
                          <p className="text-sm text-muted font-medium">{leastDone.totalCompleted || 0} times total</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-surface border border-border p-6 rounded-2xl h-[400px]">
                      <h3 className="text-[10px] font-bold text-muted uppercase tracking-wider mb-6">Completion Frequency Across All Habits</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 20 }}>
                          <XAxis dataKey="name" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                          <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                          <Tooltip 
                            cursor={{ fill: 'rgba(255,255,255,0.05)' }} 
                            contentStyle={{ borderRadius: '12px', backgroundColor: '#18181b', border: '1px solid #27272a' }} 
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                          />
                          <Bar dataKey="completed" radius={[6, 6, 0, 0]}>
                            {chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Habit Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Create New Habit">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Habit Name</label>
            <input 
              type="text" 
              value={newHabit.name}
              onChange={e => setNewHabit({...newHabit, name: e.target.value})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none"
              placeholder="e.g. Read 10 Pages"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Frequency</label>
              <select 
                value={newHabit.frequency}
                onChange={e => setNewHabit({...newHabit, frequency: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Color Theme</label>
              <input 
                type="color" 
                value={newHabit.color}
                onChange={e => setNewHabit({...newHabit, color: e.target.value})}
                className="w-full h-[38px] bg-transparent cursor-pointer rounded-lg border border-border px-1"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Target Count per {newHabit.frequency === 'daily' ? 'Day' : 'Week'}</label>
            <div className="flex items-center gap-4">
              <input 
                type="range" 
                min="1" max="10" 
                value={newHabit.targetCount}
                onChange={e => setNewHabit({...newHabit, targetCount: parseInt(e.target.value)})}
                className="flex-1 accent-accent-green"
              />
              <span className="text-foreground font-semibold bg-surface border border-border rounded-lg px-3 py-1 text-sm">{newHabit.targetCount}</span>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModalOpen(false)} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => createHabitMutation.mutate(newHabit)}
              disabled={createHabitMutation.isPending || !newHabit.name}
              className="bg-accent-green text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-green-hover transition-colors disabled:opacity-50"
            >
              {createHabitMutation.isPending ? 'Saving...' : 'Create Habit'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Routine Modal */}
      <Modal isOpen={routineModalOpen} onClose={() => setRoutineModalOpen(false)} title="Create Custom Routine">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Routine Name</label>
            <input 
              type="text" 
              value={newRoutine.name}
              onChange={e => setNewRoutine({...newRoutine, name: e.target.value})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none"
              placeholder="e.g. Bedtime Prep"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Description</label>
            <textarea 
              value={newRoutine.description}
              onChange={e => setNewRoutine({...newRoutine, description: e.target.value})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none h-20 resize-none"
              placeholder="Explain the purpose of this routine"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Why are you doing this? (Purpose)</label>
            <textarea 
              value={newRoutine.purpose}
              onChange={e => setNewRoutine({...newRoutine, purpose: e.target.value})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none h-16 resize-none"
              placeholder="e.g. To build consistency, feel healthier, improve coding skills..."
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Duration Value</label>
              <input 
                type="number" 
                min="1"
                value={newRoutine.durationValue}
                onChange={e => setNewRoutine({...newRoutine, durationValue: Math.max(1, parseInt(e.target.value) || 1)})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Duration Unit</label>
              <select
                value={newRoutine.durationType}
                onChange={e => setNewRoutine({...newRoutine, durationType: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-green focus:outline-none"
              >
                <option value="days">Days</option>
                <option value="weeks">Weeks</option>
                <option value="months">Months</option>
              </select>
            </div>
          </div>

          
          <div className="border-t border-border pt-4">
            <label className="text-sm font-semibold text-foreground block mb-2">Add Habit to Routine</label>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <input 
                type="text"
                value={tempHabit.name}
                onChange={e => setTempHabit({...tempHabit, name: e.target.value})}
                placeholder="Habit name (e.g. Journal)"
                className="bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-accent-green focus:outline-none"
              />
              <div className="flex gap-2">
                <input 
                  type="color"
                  value={tempHabit.color}
                  onChange={e => setTempHabit({...tempHabit, color: e.target.value})}
                  className="w-10 h-8 bg-transparent cursor-pointer rounded-lg border border-border p-1"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (tempHabit.name.trim()) {
                      setNewRoutine({...newRoutine, habits: [...newRoutine.habits, {...tempHabit, name: tempHabit.name.trim()}]});
                      setTempHabit({ name: '', color: '#3b82f6', frequency: 'daily', targetCount: 1 });
                    }
                  }}
                  className="flex-1 bg-surface border border-border hover:bg-surface-hover rounded-lg text-xs font-semibold text-foreground"
                >
                  Add Habit
                </button>
              </div>
            </div>
            
            {/* Added habits list preview */}
            <div className="space-y-1.5 max-h-36 overflow-y-auto">
              {newRoutine.habits.map((h, idx) => (
                <div key={idx} className="flex justify-between items-center bg-surface border border-border rounded-lg px-3 py-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                    <span className="font-medium text-foreground">{h.name}</span>
                  </div>
                  <button 
                    onClick={() => setNewRoutine({...newRoutine, habits: newRoutine.habits.filter((_, i) => i !== idx)})}
                    className="text-red-500 text-xs hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setRoutineModalOpen(false)} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => createRoutineMutation.mutate(newRoutine)}
              disabled={createRoutineMutation.isPending || !newRoutine.name || !newRoutine.purpose || newRoutine.habits.length === 0}
              className="bg-accent-green text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-green-hover transition-colors disabled:opacity-50"
            >
              {createRoutineMutation.isPending ? 'Saving...' : 'Create Routine'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Habit Stats Modal */}
      <Modal isOpen={!!selectedHabitId} onClose={() => setSelectedHabitId(null)} title="Habit Analytics">
        {isLoadingStats ? (
          <div className="flex justify-center p-8 text-muted"><Loader2 className="animate-spin" size={24} /></div>
        ) : statsData ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-accent-green mb-1">{statsData.currentStreak}</span>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">Current Streak</span>
              </div>
              <div className="bg-surface border border-border rounded-xl p-4 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-bold text-foreground mb-1">{statsData.totalLogs}</span>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">Total Logs</span>
              </div>
            </div>
            
            <div>
              <h4 className="text-sm font-medium text-foreground mb-2">Last 30 Days</h4>
              <div className="p-4 bg-surface/50 border border-border rounded-xl">
                <Heatmap history={statsData.history || {}} targetCount={statsData.targetCount || 1} />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-muted">Failed to load stats.</div>
        )}
      </Modal>
    </div>
  );
}

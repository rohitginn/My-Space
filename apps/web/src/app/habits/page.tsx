'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Loader2, Activity, Trash2, TrendingUp } from 'lucide-react';
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

type Habit = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  frequency: 'daily' | 'weekly';
  targetCount: number;
};

export default function HabitsPage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [newHabit, setNewHabit] = useState({ name: '', color: '#10b981', frequency: 'daily', targetCount: 1 });

  const today = new Date().toISOString().split('T')[0];

  const { data: habitsData, isLoading } = useQuery({
    queryKey: ['habits'],
    queryFn: async () => {
      const { data } = await api.get('/habits');
      return data.data as any[];
    }
  });

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

  if (isLoading) {
    return <div className="p-8 h-full flex items-center justify-center text-muted"><Loader2 className="animate-spin mr-3" /> Loading Habits...</div>;
  }

  const habits = habitsData || [];

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="flex justify-between items-end mb-8 z-10 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Activity className="text-accent-green" size={28} />
            Habit Tracker
          </h1>
          <p className="text-muted mt-2">Build healthy routines and track your daily progress.</p>
        </div>
        <button 
          onClick={() => setModalOpen(true)}
          className="bg-accent-green hover:bg-accent-green-hover text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          New Habit
        </button>
      </header>

      <div className="flex-1 overflow-y-auto z-10">
        {habits.length === 0 ? (
          <div className="bg-surface/50 border border-dashed border-border rounded-xl p-12 text-center text-muted flex flex-col items-center">
            <TrendingUp size={48} className="text-muted/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Habits Yet</h3>
            <p className="mb-4">Start small. Create your first habit and try to hit it today!</p>
            <button onClick={() => setModalOpen(true)} className="text-accent-green hover:underline">Create a habit</button>
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
            <p className="text-xs text-muted mt-1">Example: For "Drink 8 glasses of water", set target to 8.</p>
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

'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check, Loader2, Activity, Trash2, TrendingUp } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';

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
  const [modalOpen, setModalOpen] = useState(false);
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
              // The API presumably returns logs or stats. For now, we just mock if it's completed today
              // In reality, we'd check if `habit.logs` contains today's date.
              const isCompletedToday = habit.logs?.some((l: any) => l.logDate.startsWith(today)) || false;
              
              return (
                <div key={habit.id} className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-accent-green/30 transition-all flex flex-col group relative">
                  <button 
                    onClick={() => { if(confirm('Delete this habit?')) deleteHabitMutation.mutate(habit.id); }}
                    className="absolute top-4 right-4 text-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={16} />
                  </button>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ backgroundColor: habit.color || '#10b981' }}>
                      <Activity size={20} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground text-lg">{habit.name}</h3>
                      <p className="text-xs text-muted capitalize">{habit.frequency} • Target: {habit.targetCount}</p>
                    </div>
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-border flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">Today</p>
                      <p className="text-xs text-muted">{isCompletedToday ? "Completed! 🎉" : "Not done yet"}</p>
                    </div>
                    <button
                      onClick={() => logHabitMutation.mutate({ id: habit.id, logDate: new Date().toISOString() })}
                      disabled={isCompletedToday || logHabitMutation.isPending}
                      className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${isCompletedToday ? 'bg-accent-green text-white shadow-lg shadow-accent-green/20' : 'bg-surface-hover text-muted hover:bg-accent-green/20 hover:text-accent-green border border-border'}`}
                    >
                      {logHabitMutation.isPending && logHabitMutation.variables?.id === habit.id ? (
                        <Loader2 size={20} className="animate-spin" />
                      ) : (
                        <Check size={20} className={isCompletedToday ? "scale-110" : ""} />
                      )}
                    </button>
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
                className="w-16 h-10 bg-transparent cursor-pointer rounded-lg border-none"
              />
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
    </div>
  );
}

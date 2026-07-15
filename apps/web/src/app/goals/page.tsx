'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, Loader2, Trash2, Edit2, TrendingUp, CheckCircle } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';

type Goal = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  progress: number;
  status: 'active' | 'completed' | 'archived';
};

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { confirm, prompt } = useDialog();
  const [modalOpen, setModalOpen] = useState<{ isOpen: boolean, isEdit: boolean, data: any }>({ isOpen: false, isEdit: false, data: null });

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data.data as Goal[];
    }
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (vars: any) => {
      if (vars.id) {
        const { data } = await api.patch(`/goals/${vars.id}`, vars);
        return data.data;
      } else {
        const { data } = await api.post('/goals', vars);
        return data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setModalOpen({ isOpen: false, isEdit: false, data: null });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/goals/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    }
  });

  const updateProgress = (goal: Goal, newProgress: number) => {
    let progress = newProgress;
    if (progress < 0) progress = 0;
    if (progress > 100) progress = 100;
    
    saveGoalMutation.mutate({ 
      id: goal.id, 
      progress,
      status: progress === 100 ? 'completed' : 'active'
    });
  };

  if (isLoading) {
    return <div className="p-8 h-full flex items-center justify-center text-muted"><Loader2 className="animate-spin mr-3" /> Loading Goals...</div>;
  }

  const goals = goalsData || [];

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="flex justify-between items-end mb-8 z-10 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Target className="text-accent-blue" size={28} />
            Goals Tracker
          </h1>
          <p className="text-muted mt-2">Set long-term objectives and track your progress to success.</p>
        </div>
        <button 
          onClick={() => setModalOpen({ isOpen: true, isEdit: false, data: { title: '', description: '', targetDate: '', progress: 0 } })}
          className="bg-accent-blue hover:bg-accent-blue-hover text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          New Goal
        </button>
      </header>

      <div className="flex-1 overflow-y-auto z-10">
        {goals.length === 0 ? (
          <div className="bg-surface/50 border border-dashed border-border rounded-xl p-12 text-center text-muted flex flex-col items-center">
            <TrendingUp size={48} className="text-muted/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Goals Set</h3>
            <p className="mb-4">Aim high! Create your first long-term goal.</p>
            <button onClick={() => setModalOpen({ isOpen: true, isEdit: false, data: { title: '', description: '', targetDate: '', progress: 0 } })} className="text-accent-blue hover:underline">Create a goal</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            {goals.map((goal) => (
              <div key={goal.id} className="bg-surface border border-border rounded-xl p-6 shadow-sm hover:border-accent-blue/30 transition-all flex flex-col group relative">
                <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => setModalOpen({ isOpen: true, isEdit: true, data: goal })}
                    className="text-muted hover:text-foreground p-1 rounded-md"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={async () => { if(await confirm('Delete this goal?')) deleteGoalMutation.mutate(goal.id); }}
                    className="text-muted hover:text-red-500 p-1 rounded-md"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-start gap-3 mb-6 pr-16">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-white shrink-0 ${goal.status === 'completed' ? 'bg-accent-green' : 'bg-accent-blue'}`}>
                    {goal.status === 'completed' ? <CheckCircle size={24} /> : <Target size={24} />}
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground text-xl leading-tight">{goal.title}</h3>
                    {goal.description && <p className="text-sm text-muted mt-1">{goal.description}</p>}
                    {goal.targetDate && (
                      <p className="text-xs font-medium text-amber-500 mt-2 flex items-center gap-1">
                        🎯 Target: {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(goal.targetDate))}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="mt-auto pt-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-foreground">Progress</span>
                    <span className="text-sm font-bold text-accent-blue">{goal.progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden mb-4 border border-border">
                    <div 
                      className={`h-full transition-all duration-500 ${goal.status === 'completed' ? 'bg-accent-green' : 'bg-accent-blue'}`} 
                      style={{ width: `${goal.progress}%` }}
                    ></div>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <button 
                      onClick={() => updateProgress(goal, goal.progress - 10)}
                      disabled={goal.progress <= 0 || saveGoalMutation.isPending}
                      className="text-xs bg-surface-hover border border-border px-3 py-1.5 rounded-lg text-muted hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                      -10%
                    </button>
                    
                    <button 
                      onClick={async () => {
                        const val = await prompt('Enter new progress (0-100):', { defaultValue: goal.progress.toString() });
                        if (val !== null) {
                          const parsed = parseInt(val, 10);
                          if (!isNaN(parsed)) updateProgress(goal, parsed);
                        }
                      }}
                      className="text-xs text-muted hover:text-foreground font-medium underline underline-offset-2"
                    >
                      Set Exact
                    </button>

                    <button 
                      onClick={() => updateProgress(goal, goal.progress + 10)}
                      disabled={goal.progress >= 100 || saveGoalMutation.isPending}
                      className="text-xs bg-surface-hover border border-border px-3 py-1.5 rounded-lg text-muted hover:text-foreground disabled:opacity-50 transition-colors"
                    >
                      +10%
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={modalOpen.isOpen} onClose={() => setModalOpen({...modalOpen, isOpen: false})} title={modalOpen.isEdit ? "Edit Goal" : "New Goal"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Goal Title</label>
            <input 
              type="text" 
              value={modalOpen.data?.title || ''}
              onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, title: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. Launch SaaS Product"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Description</label>
            <textarea 
              value={modalOpen.data?.description || ''}
              onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, description: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none min-h-[80px]"
              placeholder="What exactly are you trying to achieve?"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Target Date</label>
            <input 
              type="date" 
              value={modalOpen.data?.targetDate ? new Date(modalOpen.data.targetDate).toISOString().split('T')[0] : ''}
              onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, targetDate: e.target.value || null}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
            />
          </div>
          {modalOpen.isEdit && (
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Current Progress (%)</label>
              <input 
                type="number" 
                min="0"
                max="100"
                value={modalOpen.data?.progress || 0}
                onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, progress: parseInt(e.target.value) || 0}})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              />
            </div>
          )}
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setModalOpen({...modalOpen, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => saveGoalMutation.mutate(modalOpen.data)}
              disabled={saveGoalMutation.isPending || !modalOpen.data?.title}
              className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
            >
              {saveGoalMutation.isPending ? 'Saving...' : (modalOpen.isEdit ? 'Save Changes' : 'Create Goal')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

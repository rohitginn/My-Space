'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Target, Loader2, Trash2, Edit2, TrendingUp, CheckCircle, Briefcase, Heart, DollarSign, BookOpen, Clock, CheckSquare, Square, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';

type Milestone = { id: string, title: string, completed: boolean };

type Goal = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  color: string;
  milestones: string | null; // JSON string
  targetDate: string | null;
  progress: number;
  status: 'active' | 'completed' | 'archived';
};

const CATEGORIES = [
  { id: 'personal', label: 'Personal', icon: Target },
  { id: 'health', label: 'Health', icon: Heart },
  { id: 'career', label: 'Career', icon: Briefcase },
  { id: 'wealth', label: 'Wealth', icon: DollarSign },
  { id: 'learning', label: 'Learning', icon: BookOpen },
];

export default function GoalsPage() {
  const queryClient = useQueryClient();
  const { confirm, prompt } = useDialog();
  const [modalOpen, setModalOpen] = useState<{ isOpen: boolean, isEdit: boolean, data: any }>({ isOpen: false, isEdit: false, data: null });
  const [tempMilestone, setTempMilestone] = useState('');

  const { data: goalsData, isLoading } = useQuery({
    queryKey: ['goals'],
    queryFn: async () => {
      const { data } = await api.get('/goals');
      return data.data as Goal[];
    }
  });

  const saveGoalMutation = useMutation({
    mutationFn: async (vars: any) => {
      const payload = { ...vars };
      if (typeof payload.milestones !== 'string') {
        payload.milestones = JSON.stringify(payload.milestones);
      }
      if (payload.id) {
        const { data } = await api.patch(`/goals/${payload.id}`, payload);
        return data.data;
      } else {
        const { data } = await api.post('/goals', payload);
        return data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setModalOpen({ isOpen: false, isEdit: false, data: null });
      setTempMilestone('');
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
      ...goal,
      progress,
      status: progress === 100 ? 'completed' : 'active'
    });
  };

  const toggleMilestone = (goal: Goal, mId: string) => {
    let mList: Milestone[] = [];
    try { mList = goal.milestones ? JSON.parse(goal.milestones) : []; } catch (e) {}
    
    const updated = mList.map(m => m.id === mId ? { ...m, completed: !m.completed } : m);
    
    // Auto calculate progress based on milestones if they exist
    let newProgress = goal.progress;
    if (updated.length > 0) {
      const completed = updated.filter(m => m.completed).length;
      newProgress = Math.round((completed / updated.length) * 100);
    }
    
    saveGoalMutation.mutate({
      ...goal,
      milestones: JSON.stringify(updated),
      progress: newProgress,
      status: newProgress === 100 ? 'completed' : 'active'
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
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setModalOpen({ isOpen: true, isEdit: false, data: { title: '', description: '', category: 'personal', color: '#3b82f6', targetDate: '', progress: 0, milestones: [] } })}
          className="bg-accent-blue hover:bg-accent-blue-hover text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
        >
          <Plus size={18} />
          New Goal
        </motion.button>
      </header>

      <div className="flex-1 overflow-y-auto z-10 pr-2 pb-12">
        {goals.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="bg-surface/50 border border-dashed border-border rounded-xl p-12 text-center text-muted flex flex-col items-center"
          >
            <TrendingUp size={48} className="text-muted/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No Goals Set</h3>
            <p className="mb-4">Aim high! Create your first long-term goal.</p>
            <button onClick={() => setModalOpen({ isOpen: true, isEdit: false, data: { title: '', description: '', category: 'personal', color: '#3b82f6', targetDate: '', progress: 0, milestones: [] } })} className="text-accent-blue hover:underline">Create a goal</button>
          </motion.div>
        ) : (
          <motion.div layout className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AnimatePresence>
              {goals.map((goal) => {
                let mList: Milestone[] = [];
                try { mList = goal.milestones ? JSON.parse(goal.milestones) : []; } catch (e) {}
                
                const catObj = CATEGORIES.find(c => c.id === goal.category) || CATEGORIES[0];
                const CatIcon = catObj.icon;
                
                // Calculate days left
                let daysLeft = null;
                let isUrgent = false;
                if (goal.targetDate && goal.status !== 'completed') {
                  const diff = new Date(goal.targetDate).getTime() - new Date().getTime();
                  daysLeft = Math.ceil(diff / (1000 * 3600 * 24));
                  isUrgent = daysLeft <= 7 && daysLeft >= 0;
                }

                return (
                  <motion.div 
                    layoutId={`goal-${goal.id}`}
                    initial={{ opacity: 0, scale: 0.95 }} 
                    animate={{ opacity: 1, scale: 1 }} 
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    key={goal.id} 
                    className="bg-surface glass border border-border rounded-2xl p-6 shadow-sm hover:border-accent-blue/30 transition-colors flex flex-col group relative overflow-hidden"
                  >
                    {/* Background tint based on user color */}
                    <div className="absolute top-0 right-0 w-32 h-32 opacity-10 rounded-full blur-3xl" style={{ backgroundColor: goal.color }}></div>

                    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <button 
                        onClick={() => {
                          const parsedMilestones = goal.milestones ? JSON.parse(goal.milestones) : [];
                          setModalOpen({ isOpen: true, isEdit: true, data: { ...goal, milestones: parsedMilestones } });
                        }}
                        className="bg-surface-hover text-muted hover:text-foreground p-1.5 rounded-lg shadow-sm"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={async () => { if(await confirm('Delete this goal?')) deleteGoalMutation.mutate(goal.id); }}
                        className="bg-surface-hover text-muted hover:text-red-500 p-1.5 rounded-lg shadow-sm"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>

                    <div className="flex items-start gap-4 mb-6 pr-20 z-10">
                      <div 
                        className={`w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg`} 
                        style={{ backgroundColor: goal.status === 'completed' ? '#10b981' : goal.color }}
                      >
                        {goal.status === 'completed' ? <CheckCircle size={28} /> : <CatIcon size={28} />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border" style={{ borderColor: `${goal.color}40`, color: goal.color }}>
                            {catObj.label}
                          </span>
                          {daysLeft !== null && (
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1 ${isUrgent ? 'bg-red-500/10 text-red-500' : 'bg-surface-hover text-muted'}`}>
                              <Clock size={10} />
                              {daysLeft < 0 ? 'Overdue' : `${daysLeft} days left`}
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-foreground text-xl leading-tight">{goal.title}</h3>
                        {goal.description && <p className="text-sm text-muted mt-1.5">{goal.description}</p>}
                      </div>
                    </div>
                    
                    {/* Milestones Checklist */}
                    {mList.length > 0 && (
                      <div className="mb-6 z-10 bg-background/50 rounded-xl p-3 border border-border">
                        <h4 className="text-[10px] uppercase font-bold text-muted mb-2 px-1">Milestones</h4>
                        <div className="space-y-1">
                          {mList.map(m => (
                            <motion.div 
                              whileHover={{ x: 4 }}
                              key={m.id} 
                              onClick={() => toggleMilestone(goal, m.id)}
                              className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-surface-hover transition-colors group/ms"
                            >
                              <div className={`text-${m.completed ? 'accent-green' : 'muted'} transition-colors`}>
                                {m.completed ? <CheckSquare size={16} /> : <Square size={16} className="group-hover/ms:text-foreground" />}
                              </div>
                              <span className={`text-sm ${m.completed ? 'text-muted line-through' : 'text-foreground font-medium'}`}>{m.title}</span>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div className="mt-auto pt-4 z-10">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-foreground">Overall Progress</span>
                        <motion.span 
                          key={goal.progress}
                          initial={{ scale: 1.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                          className="text-sm font-bold" 
                          style={{ color: goal.status === 'completed' ? '#10b981' : goal.color }}
                        >
                          {goal.progress}%
                        </motion.span>
                      </div>
                      <div className="h-2.5 w-full bg-surface-hover rounded-full overflow-hidden mb-4 border border-border">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${goal.progress}%` }}
                          transition={{ type: 'spring', stiffness: 100, damping: 20 }}
                          className={`h-full`} 
                          style={{ backgroundColor: goal.status === 'completed' ? '#10b981' : goal.color }}
                        />
                      </div>
                      
                      {mList.length === 0 && (
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
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}
      </div>

      <Modal isOpen={modalOpen.isOpen} onClose={() => { setModalOpen({...modalOpen, isOpen: false}); setTempMilestone(''); }} title={modalOpen.isEdit ? "Edit Goal" : "New Goal"}>
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
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Category</label>
              <select
                value={modalOpen.data?.category || 'personal'}
                onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, category: e.target.value}})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none capitalize"
              >
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Theme Color</label>
              <input 
                type="color" 
                value={modalOpen.data?.color || '#3b82f6'}
                onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, color: e.target.value}})}
                className="w-full h-[38px] bg-transparent cursor-pointer rounded-lg border border-border px-1"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted block mb-1">Description</label>
            <textarea 
              value={modalOpen.data?.description || ''}
              onChange={e => setModalOpen({...modalOpen, data: {...modalOpen.data, description: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none h-16 resize-none"
              placeholder="What exactly are you trying to achieve?"
            />
          </div>

          <div className="border-t border-border pt-4">
            <label className="text-sm font-medium text-muted block mb-2">Milestones (Break it down)</label>
            <div className="flex gap-2 mb-3">
              <input 
                type="text" 
                value={tempMilestone}
                onChange={e => setTempMilestone(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && tempMilestone.trim()) {
                    e.preventDefault();
                    setModalOpen({
                      ...modalOpen,
                      data: { ...modalOpen.data, milestones: [...(modalOpen.data.milestones || []), { id: Date.now().toString(), title: tempMilestone.trim(), completed: false }] }
                    });
                    setTempMilestone('');
                  }
                }}
                className="flex-1 bg-surface border border-border rounded-lg px-3 py-1.5 text-sm text-foreground focus:border-accent-blue focus:outline-none"
                placeholder="e.g. Finish landing page"
              />
              <button 
                type="button"
                onClick={() => {
                  if (tempMilestone.trim()) {
                    setModalOpen({
                      ...modalOpen,
                      data: { ...modalOpen.data, milestones: [...(modalOpen.data.milestones || []), { id: Date.now().toString(), title: tempMilestone.trim(), completed: false }] }
                    });
                    setTempMilestone('');
                  }
                }}
                className="bg-surface-hover border border-border px-3 rounded-lg text-sm font-medium text-foreground"
              >
                Add
              </button>
            </div>
            
            <div className="space-y-1.5 max-h-32 overflow-y-auto">
              {(modalOpen.data?.milestones || []).map((m: Milestone) => (
                <div key={m.id} className="flex justify-between items-center bg-background border border-border p-2 rounded-lg text-sm">
                  <span className={m.completed ? 'line-through text-muted' : 'text-foreground'}>{m.title}</span>
                  <button 
                    onClick={() => setModalOpen({
                      ...modalOpen, 
                      data: { ...modalOpen.data, milestones: modalOpen.data.milestones.filter((ms: Milestone) => ms.id !== m.id) }
                    })}
                    className="text-red-500 hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
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

          {modalOpen.isEdit && (!modalOpen.data.milestones || modalOpen.data.milestones.length === 0) && (
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
            <button onClick={() => { setModalOpen({...modalOpen, isOpen: false}); setTempMilestone(''); }} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
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

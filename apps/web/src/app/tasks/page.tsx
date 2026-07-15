'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Circle, Clock, Plus, MoreHorizontal, Calendar as CalendarIcon, Tag, Loader2, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';

type Todo = {
  id: string;
  title: string;
  description: string | null;
  isCompleted: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  energyLevel?: 'low' | 'medium' | 'high';
  durationMinutes?: number | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  dueDate: string | null;
  parentId?: string | null;
  createdAt: string;
};

export default function TasksPage() {
  const queryClient = useQueryClient();
  const { alert, confirm, prompt } = useDialog();
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newTaskDueDate, setNewTaskDueDate] = useState<string>('');
  const [newTaskDuration, setNewTaskDuration] = useState<string>('');
  const [newTaskEnergy, setNewTaskEnergy] = useState<'low' | 'medium' | 'high'>('medium');
  const [editingTask, setEditingTask] = useState<Todo | null>(null);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  const [smartSort, setSmartSort] = useState(false);

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data } = await api.get('/todos');
      return data.data as Todo[];
    }
  });

  const createMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await api.post('/todos', vars);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setNewTaskTitle('');
      setNewTaskPriority('medium');
      setNewTaskDueDate('');
      setNewTaskDuration('');
      setNewTaskEnergy('medium');
    }
  });

  const autoScheduleMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/todos/auto-schedule');
      return data;
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      await alert(`Auto-scheduled ${data.data.scheduled} tasks successfully!`);
    }
  });

  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data } = await api.patch(`/todos/${id}/toggle`);
      return data.data;
    },
    onSuccess: (data) => {
      if (data && data.isCompleted) {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#3b82f6', '#10b981', '#f59e0b']
        });
      }
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: Partial<Todo>) => {
      const { data } = await api.patch(`/todos/${vars.id}`, vars);
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
      setEditingTask(null);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/todos/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todos'] });
    }
  });

  const handleQuickAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTaskTitle.trim() && !createMutation.isPending) {
      createMutation.mutate({ 
        title: newTaskTitle.trim(), 
        priority: newTaskPriority, 
        dueDate: newTaskDueDate || null,
        durationMinutes: newTaskDuration ? parseInt(newTaskDuration) : undefined,
        energyLevel: newTaskEnergy
      });
    }
  };

  const tasks = response || [];
  let activeTasks = tasks.filter(t => !t.isCompleted);
  const completedTasks = tasks.filter(t => t.isCompleted);

  if (smartSort) {
    const hour = new Date().getHours();
    activeTasks.sort((a, b) => {
      const energyMap: Record<string, number> = { high: 3, medium: 2, low: 1 };
      const ea = energyMap[a.energyLevel || 'medium'];
      const eb = energyMap[b.energyLevel || 'medium'];
      if (hour < 12) {
        return eb - ea; // Morning: High energy first
      } else {
        return ea - eb; // Afternoon: Low energy first
      }
    });
  }

  const parentTasks = activeTasks.filter(t => !t.parentId);
  const getSubtasks = (parentId: string) => activeTasks.filter(t => t.parentId === parentId);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-amber-500 bg-amber-500/10';
      case 'medium': return 'text-accent-blue bg-accent-blue/10';
      default: return 'text-muted bg-surface';
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
  };

  return (
    <div className="flex h-full w-full bg-background relative overflow-hidden">
      {/* Ambient glowing blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-0 w-[500px] h-[500px] bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col p-12 overflow-y-auto z-10 relative">
        <div className="max-w-4xl mx-auto w-full">
          
          <header className="flex justify-between items-end mb-12">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight mb-2">My Tasks</h1>
              <p className="text-muted text-lg">You have <span className="text-accent-blue font-semibold">{activeTasks.length}</span> active tasks.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSmartSort(!smartSort)}
                className={`px-4 py-2.5 rounded-xl font-medium transition-colors flex items-center gap-2 border ${smartSort ? 'bg-accent-blue/10 text-accent-blue border-accent-blue/30' : 'bg-surface text-foreground border-border hover:bg-surface-hover'}`}
              >
                Smart Sort
              </button>
              <button 
                onClick={() => autoScheduleMutation.mutate()}
                disabled={autoScheduleMutation.isPending}
                className="bg-accent-green text-white hover:bg-accent-green-hover px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-accent-green/20 flex items-center gap-2 disabled:opacity-50"
              >
                {autoScheduleMutation.isPending ? <Loader2 size={18} className="animate-spin" /> : <CalendarIcon size={18} />}
                Auto-Schedule
              </button>
              <button className="bg-foreground text-background hover:bg-foreground/90 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-foreground/10 flex items-center gap-2">
                <Plus size={20} />
                Add Task
              </button>
            </div>
          </header>

          {/* Quick Add Input */}
          <div className="glass bg-surface/50 border border-border p-2 rounded-2xl mb-12 shadow-sm flex items-center focus-within:border-accent-blue/50 focus-within:ring-1 focus-within:ring-accent-blue/50 transition-all">
            <div className="p-3 text-muted">
              {createMutation.isPending ? <Loader2 size={20} className="animate-spin text-accent-blue" /> : <Plus size={20} />}
            </div>
            <input 
              type="text" 
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={handleQuickAdd}
              disabled={createMutation.isPending}
              placeholder="What needs to be done? (Press Enter to save)" 
              className="flex-1 bg-transparent border-none outline-none text-foreground placeholder:text-muted/50 text-lg px-2 disabled:opacity-50"
            />
            <div className="flex items-center gap-2 pr-2">
              <div className="relative group">
                <input 
                  type="date" 
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Set Due Date"
                />
                <button className={`p-2 rounded-lg transition-colors flex items-center justify-center ${newTaskDueDate ? 'text-accent-blue bg-accent-blue/10' : 'text-muted hover:bg-surface hover:text-foreground'}`}>
                  <CalendarIcon size={18} />
                </button>
              </div>
              <div className="relative group">
                <select
                  value={newTaskEnergy}
                  onChange={(e) => setNewTaskEnergy(e.target.value as any)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Set Energy Level"
                >
                  <option value="low">Low Energy</option>
                  <option value="medium">Medium Energy</option>
                  <option value="high">High Energy</option>
                </select>
                <button className={`p-2 rounded-lg transition-colors flex items-center justify-center ${newTaskEnergy !== 'medium' ? 'text-accent-green bg-accent-green/10' : 'text-muted hover:bg-surface hover:text-foreground'}`}>
                  ⚡
                </button>
              </div>
              <input 
                type="number" 
                placeholder="Duration (m)"
                value={newTaskDuration}
                onChange={e => setNewTaskDuration(e.target.value)}
                className="w-24 bg-surface border border-border rounded-lg px-2 py-1 text-sm text-foreground focus:outline-none"
              />
              <div className="relative group">
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as any)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  title="Set Priority"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
                <button className={`p-2 rounded-lg transition-colors flex items-center justify-center ${newTaskPriority !== 'medium' ? getPriorityColor(newTaskPriority) : 'text-muted hover:bg-surface hover:text-foreground'}`}>
                  <Tag size={18} />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center p-12 text-muted">
              <Loader2 className="animate-spin mr-2" size={24} />
              Loading tasks...
            </div>
          ) : isError ? (
            <div className="p-6 bg-red-500/10 text-red-500 rounded-xl flex items-center gap-3">
              <AlertCircle size={20} />
              Failed to load tasks. Please try again.
            </div>
          ) : (
            <>
              {/* Active Tasks */}
              <div className="mb-10 min-h-[100px]">
                <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 px-2">To Do</h2>
                
                {activeTasks.length === 0 ? (
                  <div className="text-center p-8 border border-dashed border-border rounded-2xl text-muted">
                    No active tasks right now. You're all caught up!
                  </div>
                ) : (
                  <motion.div layout className="space-y-3">
                    {parentTasks.map(task => (
                      <motion.div layout key={task.id} className="space-y-2">
                        <div 
                          className="group flex items-center gap-4 bg-surface-glass border border-border/50 hover:border-border p-4 rounded-2xl transition-all duration-200"
                        >
                          <button 
                            onClick={() => toggleMutation.mutate(task.id)} 
                            disabled={toggleMutation.isPending}
                            className="text-muted hover:text-accent-green transition-colors disabled:opacity-50"
                          >
                            <Circle size={24} strokeWidth={1.5} />
                          </button>
                          
                          <div className="flex-1">
                            <h3 className="text-foreground font-medium text-lg">{task.title}</h3>
                          </div>

                          <div className="flex items-center gap-4 text-sm font-medium">
                            <span className={`px-2.5 py-1 rounded-md text-xs uppercase tracking-wider ${getPriorityColor(task.priority)}`}>
                              {task.priority}
                            </span>
                            
                            {task.energyLevel && (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-transparent text-muted">
                                ⚡ {task.energyLevel}
                              </span>
                            )}

                            {task.scheduledStart && (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-accent-blue/10 text-accent-blue">
                                <CalendarIcon size={14} />
                                {new Date(task.scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                            
                            {task.dueDate && !task.scheduledStart && (
                              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-transparent text-muted">
                                <Clock size={14} />
                                {formatDate(task.dueDate)}
                              </span>
                            )}
                          </div>

                          <div className="relative">
                            <button 
                              onClick={() => setActiveDropdownId(activeDropdownId === task.id ? null : task.id)}
                              className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground p-2 rounded-lg hover:bg-surface transition-all"
                            >
                              <MoreHorizontal size={20} />
                            </button>
                            {activeDropdownId === task.id && (
                              <div className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
                                <button 
                                  onClick={async () => { 
                                    const subtaskTitle = await prompt('Subtask Title:');
                                    if(subtaskTitle) {
                                      createMutation.mutate({ title: subtaskTitle, priority: 'medium', dueDate: null, parentId: task.id });
                                    }
                                    setActiveDropdownId(null); 
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
                                >
                                  <Plus size={14} /> Add Subtask
                                </button>
                                <button 
                                  onClick={() => { setEditingTask(task); setActiveDropdownId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
                                >
                                  <Edit size={14} /> Edit
                                </button>
                                <button 
                                  onClick={async () => { if(await confirm('Delete task?')) deleteMutation.mutate(task.id); setActiveDropdownId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                                >
                                  <Trash2 size={14} /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Subtasks */}
                        {getSubtasks(task.id).length > 0 && (
                          <div className="pl-12 space-y-2 relative before:absolute before:left-6 before:top-0 before:bottom-4 before:w-px before:bg-border">
                            {getSubtasks(task.id).map(subtask => (
                              <div 
                                key={subtask.id} 
                                className="group flex items-center gap-3 bg-surface/50 border border-border/50 hover:border-border p-3 rounded-xl transition-all duration-200 relative before:absolute before:left-[-24px] before:top-1/2 before:w-6 before:h-px before:bg-border"
                              >
                                <button 
                                  onClick={() => toggleMutation.mutate(subtask.id)} 
                                  disabled={toggleMutation.isPending}
                                  className="text-muted hover:text-accent-green transition-colors disabled:opacity-50"
                                >
                                  <Circle size={20} strokeWidth={1.5} />
                                </button>
                                
                                <div className="flex-1">
                                  <h3 className="text-foreground font-medium text-md">{subtask.title}</h3>
                                </div>

                                <div className="flex items-center gap-4 text-sm font-medium">
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider ${getPriorityColor(subtask.priority)}`}>
                                    {subtask.priority}
                                  </span>
                                </div>
                                <div className="relative">
                                  <button 
                                    onClick={() => setActiveDropdownId(activeDropdownId === subtask.id ? null : subtask.id)}
                                    className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground p-1 rounded-lg hover:bg-surface transition-all"
                                  >
                                    <MoreHorizontal size={16} />
                                  </button>
                                  {activeDropdownId === subtask.id && (
                                    <div className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
                                      <button 
                                        onClick={() => { setEditingTask(subtask); setActiveDropdownId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
                                      >
                                        <Edit size={14} /> Edit
                                      </button>
                                      <button 
                                        onClick={async () => { if(await confirm('Delete subtask?')) deleteMutation.mutate(subtask.id); setActiveDropdownId(null); }}
                                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                                      >
                                        <Trash2 size={14} /> Delete
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </motion.div>
                )}
              </div>

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (
                <div>
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4 px-2">Completed</h2>
                  <motion.div layout className="space-y-3 opacity-60 hover:opacity-100 transition-opacity duration-300">
                    {completedTasks.map(task => (
                      <motion.div 
                        layout
                        key={task.id} 
                        className="group flex items-center gap-4 bg-transparent border border-transparent hover:bg-surface-glass hover:border-border/50 p-4 rounded-2xl transition-all duration-200"
                      >
                        <button 
                          onClick={() => toggleMutation.mutate(task.id)} 
                          disabled={toggleMutation.isPending}
                          className="text-accent-green disabled:opacity-50"
                        >
                          <CheckCircle2 size={24} strokeWidth={1.5} />
                        </button>
                        
                        <div className="flex-1">
                          <h3 className="text-muted font-medium text-lg line-through">{task.title}</h3>
                        </div>

                        <div className="flex items-center gap-4 text-sm font-medium opacity-70">
                          {task.dueDate && (
                            <span className="text-muted flex items-center gap-1.5 px-2.5 py-1">
                              <Clock size={14} />
                              {formatDate(task.dueDate)}
                            </span>
                          )}
                        </div>

                        <div className="relative">
                          <button 
                            onClick={() => setActiveDropdownId(activeDropdownId === task.id ? null : task.id)}
                            className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground p-2 rounded-lg hover:bg-surface transition-all"
                          >
                            <MoreHorizontal size={20} />
                          </button>
                          {activeDropdownId === task.id && (
                            <div className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
                              <button 
                                onClick={async () => { if(await confirm('Delete task?')) deleteMutation.mutate(task.id); setActiveDropdownId(null); }}
                                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                              >
                                <Trash2 size={14} /> Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              )}
            </>
          )}
          
        </div>
      </div>

      {editingTask && (
        <Modal isOpen={!!editingTask} onClose={() => setEditingTask(null)} title="Edit Task">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Title</label>
              <input 
                type="text" 
                value={editingTask.title}
                onChange={e => setEditingTask({...editingTask, title: e.target.value})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-muted block mb-1">Priority</label>
                <select 
                  value={editingTask.priority}
                  onChange={e => setEditingTask({...editingTask, priority: e.target.value as any})}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-muted block mb-1">Due Date</label>
                <input 
                  type="date" 
                  value={editingTask.dueDate ? new Date(editingTask.dueDate).toISOString().split('T')[0] : ''}
                  onChange={e => setEditingTask({...editingTask, dueDate: e.target.value || null})}
                  className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setEditingTask(null)} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
              <button 
                onClick={() => updateMutation.mutate({ id: editingTask.id, title: editingTask.title, priority: editingTask.priority, dueDate: editingTask.dueDate })}
                disabled={updateMutation.isPending}
                className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
              >
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </Modal>
      )}

    </div>
  );
}

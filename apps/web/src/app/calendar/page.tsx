'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Plus, MoreHorizontal, Loader2, Edit, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

type CalendarEvent = {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  color: string | null;
  isAllDay: boolean;
  readOnly?: boolean;
};

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());

  // Modals state
  const [eventModal, setEventModal] = useState<{isOpen: boolean, isEdit: boolean, data: any}>({isOpen: false, isEdit: false, data: null});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const startQueryDate = new Date(year, month, 1 - firstDay).toISOString();
  const endQueryDate = new Date(year, month, daysInMonth + (42 - (daysInMonth + firstDay))).toISOString();

  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['calendar', 'events', month, year],
    queryFn: async () => {
      const { data } = await api.get(`/calendar/events?start=${startQueryDate}&end=${endQueryDate}`);
      return data.data as CalendarEvent[];
    }
  });

  const { data: boardsData } = useQuery({
    queryKey: ['kanban', 'boards'],
    queryFn: async () => {
      const { data } = await api.get('/kanban/boards');
      return data.data;
    }
  });

  const { data: todosData } = useQuery({
    queryKey: ['todos'],
    queryFn: async () => {
      const { data } = await api.get('/todos');
      return data.data;
    }
  });

  const saveEventMutation = useMutation({
    mutationFn: async (vars: { id?: string, title: string, startTime: string, endTime: string, color: string, isAllDay: boolean }) => {
      if (vars.id) {
        const { data } = await api.patch(`/calendar/events/${vars.id}`, vars);
        return data.data;
      } else {
        const { data } = await api.post('/calendar/events', vars);
        return data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
      setEventModal({isOpen: false, isEdit: false, data: null});
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/calendar/events/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar', 'events'] });
    }
  });

  const allEvents: CalendarEvent[] = [...(eventsData || [])];
  
  if (boardsData && Array.isArray(boardsData)) {
    boardsData.forEach((board: any) => {
      if (board.columns && Array.isArray(board.columns)) {
        board.columns.forEach((col: any) => {
          if (col.cards && Array.isArray(col.cards)) {
            col.cards.forEach((card: any) => {
          if (card.dueDate) {
            allEvents.push({
              id: `card-${card.id}`,
              title: `${card.title}`,
              startTime: card.dueDate,
              endTime: card.dueDate,
              color: '#3b82f6', // blue
              isAllDay: true,
              readOnly: true
            });
          }
            });
          }
        });
      }
    });
  }

  if (todosData && Array.isArray(todosData)) {
    todosData.forEach((todo: any) => {
      if (todo.dueDate && !todo.isCompleted) {
        allEvents.push({
          id: `todo-${todo.id}`,
          title: `${todo.title}`,
          startTime: todo.dueDate,
          endTime: todo.dueDate,
          color: '#10b981', // green
          isAllDay: true,
          readOnly: true
        });
      }
    });
  }

  const gridCells = [];
  let currentDay = new Date(year, month, 1 - firstDay);
  for (let i = 0; i < 42; i++) {
    const isCurrentMonth = currentDay.getMonth() === month;
    const cellDateStr = `${currentDay.getFullYear()}-${String(currentDay.getMonth() + 1).padStart(2, '0')}-${String(currentDay.getDate()).padStart(2, '0')}`;
    
    const dayEvents = allEvents.filter(e => {
      const eDateObj = new Date(e.startTime);
      const eDateStr = `${eDateObj.getFullYear()}-${String(eDateObj.getMonth() + 1).padStart(2, '0')}-${String(eDateObj.getDate()).padStart(2, '0')}`;
      return eDateStr === cellDateStr;
    });

    gridCells.push({
      dateObj: new Date(currentDay),
      isCurrentMonth,
      events: dayEvents
    });

    currentDay.setDate(currentDay.getDate() + 1);
  }

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const goToday = () => setCurrentDate(new Date());

  const monthName = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(currentDate);
  const todayDateObj = new Date();
  const todayStr = `${todayDateObj.getFullYear()}-${String(todayDateObj.getMonth() + 1).padStart(2, '0')}-${String(todayDateObj.getDate()).padStart(2, '0')}`;

  return (
    <div className="flex flex-col h-full w-full bg-background relative overflow-hidden p-8">
      <div className="absolute top-0 right-1/3 w-[600px] h-[600px] bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <header className="flex justify-between items-end mb-8 shrink-0 z-10">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-4">
            {monthName}
          </h1>
          <p className="text-muted mt-2">Manage your schedule and upcoming events.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface border border-border rounded-xl p-1 shadow-sm">
            <button onClick={prevMonth} className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors">
              <ChevronLeft size={20} />
            </button>
            <button onClick={goToday} className="px-4 py-2 font-medium text-foreground hover:bg-surface-hover rounded-lg transition-colors text-sm">
              Today
            </button>
            <button onClick={nextMonth} className="p-2 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <button 
            onClick={() => setEventModal({
              isOpen: true, 
              isEdit: false, 
              data: {
                title: '', 
                startTime: new Date().toISOString().split('T')[0] + 'T09:00',
                endTime: new Date().toISOString().split('T')[0] + 'T10:00',
                color: '#8b5cf6',
                isAllDay: false
              }
            })}
            className="bg-accent-blue text-white hover:bg-accent-blue-hover px-4 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-accent-blue/20 flex items-center gap-2"
          >
            <Plus size={18} />
            New Event
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col bg-surface-glass border border-border rounded-2xl overflow-hidden shadow-sm backdrop-blur-md z-10">
        <div className="grid grid-cols-7 border-b border-border bg-surface/50">
          {DAYS_OF_WEEK.map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-muted uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>

        <div className="flex-1 grid grid-cols-7 grid-rows-6">
          {isLoading && !eventsData ? (
            <div className="col-span-7 row-span-6 flex items-center justify-center text-muted">
              <Loader2 size={32} className="animate-spin mr-3" />
              Loading Events...
            </div>
          ) : (
            gridCells.map((cell, i) => {
              const cellDateStr = `${cell.dateObj.getFullYear()}-${String(cell.dateObj.getMonth() + 1).padStart(2, '0')}-${String(cell.dateObj.getDate()).padStart(2, '0')}`;
              const isToday = cellDateStr === todayStr;
              return (
                <div 
                  key={i} 
                  className={`border-b border-r border-border/50 p-2 min-h-24 hover:bg-surface-hover transition-colors group ${
                    !cell.isCurrentMonth ? 'bg-surface/30 opacity-50' : ''
                  } ${i % 7 === 6 ? 'border-r-0' : ''} ${i >= 35 ? 'border-b-0' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                      isToday ? 'bg-accent-blue text-white shadow-md shadow-accent-blue/20' : 'text-foreground'
                    }`}>
                      {cell.dateObj.getDate()}
                    </span>
                  </div>
                  
                  <div className="space-y-1">
                    {cell.events.map(event => (
                      <div 
                        key={event.id}
                        className="relative group/event"
                      >
                        <div
                          onClick={() => {
                            if (!event.readOnly) {
                              setEventModal({isOpen: true, isEdit: true, data: {...event, startTime: event.startTime.slice(0, 16), endTime: event.endTime.slice(0, 16)}})
                            }
                          }}
                          className={`px-2 py-1 rounded text-xs font-medium border truncate ${!event.readOnly ? 'cursor-pointer' : ''}`}
                          style={{ 
                            backgroundColor: `${event.color || '#8b5cf6'}20`, 
                            color: event.color || '#8b5cf6',
                            borderColor: `${event.color || '#8b5cf6'}30`
                          }}
                          title={event.readOnly ? 'Synced Task (Edit in Tasks/Projects)' : ''}
                        >
                          {event.isAllDay ? 'All Day' : new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startTime))} {event.title}
                        </div>
                        {!event.readOnly && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); if(confirm('Delete event?')) deleteEventMutation.mutate(event.id); }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/event:opacity-100 p-1 text-red-500 hover:bg-red-500/20 rounded bg-background shadow"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <Modal isOpen={eventModal.isOpen} onClose={() => setEventModal({...eventModal, isOpen: false})} title={eventModal.isEdit ? "Edit Event" : "New Event"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Event Title</label>
            <input 
              type="text" 
              value={eventModal.data?.title || ''}
              onChange={e => setEventModal({...eventModal, data: {...eventModal.data, title: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. Weekly Sync"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="isAllDay"
              checked={eventModal.data?.isAllDay || false}
              onChange={e => setEventModal({...eventModal, data: {...eventModal.data, isAllDay: e.target.checked}})}
              className="w-4 h-4"
            />
            <label htmlFor="isAllDay" className="text-sm font-medium text-foreground">All Day Event</label>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Start Time</label>
              <input 
                type={eventModal.data?.isAllDay ? "date" : "datetime-local"} 
                value={eventModal.data?.isAllDay ? eventModal.data?.startTime?.split('T')[0] : eventModal.data?.startTime}
                onChange={e => setEventModal({...eventModal, data: {...eventModal.data, startTime: e.target.value}})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-muted block mb-1">End Time</label>
              <input 
                type={eventModal.data?.isAllDay ? "date" : "datetime-local"} 
                value={eventModal.data?.isAllDay ? eventModal.data?.endTime?.split('T')[0] : eventModal.data?.endTime}
                onChange={e => setEventModal({...eventModal, data: {...eventModal.data, endTime: e.target.value}})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-muted block mb-1">Color Theme</label>
            <div className="flex gap-2 mt-2">
              {['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'].map(color => (
                <button
                  key={color}
                  onClick={() => setEventModal({...eventModal, data: {...eventModal.data, color}})}
                  className={`w-8 h-8 rounded-full border-2 ${eventModal.data?.color === color ? 'border-foreground shadow-lg scale-110' : 'border-transparent hover:scale-110'} transition-all`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setEventModal({...eventModal, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => {
                let start = eventModal.data.startTime;
                let end = eventModal.data.endTime;
                if (eventModal.data.isAllDay) {
                  // Ensure they are full ISO strings for dates
                  if (start.length === 10) start += 'T00:00:00.000Z';
                  if (end.length === 10) end += 'T23:59:59.999Z';
                } else {
                  if (start.length === 16) start += ':00.000Z';
                  if (end.length === 16) end += ':00.000Z';
                }
                saveEventMutation.mutate({ ...eventModal.data, startTime: start, endTime: end });
              }}
              disabled={saveEventMutation.isPending || !eventModal.data?.title}
              className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
            >
              {saveEventMutation.isPending ? 'Saving...' : (eventModal.isEdit ? 'Save Changes' : 'Create Event')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

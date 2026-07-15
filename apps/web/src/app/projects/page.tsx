'use client';

import { useState, useEffect } from 'react';
import { DndContext, DragOverlay, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, DragStartEvent, DragOverEvent, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MoreHorizontal, MessageSquare, Clock, Loader2, AlertCircle, Edit, Trash2, Calendar as CalendarIcon, Tag } from 'lucide-react';
import api from '@/lib/api';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';

type KanbanCard = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  dueDate: string | null;
  sortOrder: number;
};

type KanbanColumn = {
  id: string;
  title: string;
  color: string;
  sortOrder: number;
  cards: KanbanCard[];
};

type KanbanBoard = {
  id: string;
  title: string;
  description: string | null;
  columns: KanbanColumn[];
};


function SortableCard({ card, activeDropdownId, setActiveDropdownId, setCardModal, deleteCardMutation, getPriorityColor }: any) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: card.id, data: { type: 'Card', card } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-surface/80 backdrop-blur-md border border-border rounded-xl p-4 shadow-sm hover:border-accent-blue/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group touch-none"
    >
      <div className="flex justify-between items-start mb-3">
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider" style={{ color: getPriorityColor(card.priority), backgroundColor: `${getPriorityColor(card.priority)}20` }}>
          {card.priority}
        </span>
        <div className="relative">
          <button 
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); setActiveDropdownId(activeDropdownId === `card-${card.id}` ? null : `card-${card.id}`); }}
            className="opacity-0 group-hover:opacity-100 text-muted hover:text-foreground transition-opacity"
          >
            <MoreHorizontal size={14} />
          </button>
          {activeDropdownId === `card-${card.id}` && (
            <div className="absolute right-0 mt-2 w-32 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20" onPointerDown={e => e.stopPropagation()}>
              <button 
                onClick={(e) => { e.stopPropagation(); setCardModal({isOpen: true, isEdit: true, columnId: card.columnId, data: card}); setActiveDropdownId(null); }}
                className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
              >
                <Edit size={14} /> Edit
              </button>
              <button 
                onClick={async (e) => { e.stopPropagation(); if(await confirm('Delete card?')) deleteCardMutation.mutate(card.id); setActiveDropdownId(null); }}
                className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
              >
                <Trash2 size={14} /> Delete
              </button>
            </div>
          )}
        </div>
      </div>
      
      <h4 className="text-foreground font-medium mb-4 leading-snug">{card.title}</h4>
      
      <div className="flex items-center justify-between text-muted mt-auto pt-2 border-t border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-xs font-medium">
            <MessageSquare size={12} /> 0
          </div>
        </div>
        
        {card.dueDate && (
          <div className="flex items-center gap-1 text-xs font-medium text-amber-500">
            <Clock size={12} />
            {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(card.dueDate))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const { confirm } = useDialog();
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  // Modals state
  const [boardModal, setBoardModal] = useState<{isOpen: boolean, isEdit: boolean, data: any}>({isOpen: false, isEdit: false, data: null});
  const [columnModal, setColumnModal] = useState<{isOpen: boolean, isEdit: boolean, boardId: string, data: any}>({isOpen: false, isEdit: false, boardId: '', data: null});
  const [cardModal, setCardModal] = useState<{isOpen: boolean, isEdit: boolean, columnId: string, data: any}>({isOpen: false, isEdit: false, columnId: '', data: null});
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);

  const { data: boardsData, isLoading: isLoadingBoards } = useQuery({
    queryKey: ['kanban', 'boards'],
    queryFn: async () => {
      const { data } = await api.get('/kanban/boards');
      return data.data as KanbanBoard[];
    }
  });

  useEffect(() => {
    if (boardsData && boardsData.length > 0 && !activeBoardId) {
      setActiveBoardId(boardsData[0].id);
    }
  }, [boardsData, activeBoardId]);

  const { data: activeBoard, isLoading: isLoadingBoard } = useQuery({
    queryKey: ['kanban', 'boards', activeBoardId],
    queryFn: async () => {
      if (!activeBoardId) return null;
      const { data } = await api.get(`/kanban/boards/${activeBoardId}`);
      return data.data as KanbanBoard;
    },
    enabled: !!activeBoardId
  });

  // --- BOARDS ---
  const saveBoardMutation = useMutation({
    mutationFn: async (vars: { id?: string, title: string, description: string }) => {
      if (vars.id) {
        const { data } = await api.patch(`/kanban/boards/${vars.id}`, { title: vars.title, description: vars.description });
        return data.data;
      } else {
        const { data } = await api.post('/kanban/boards', { title: vars.title, description: vars.description });
        return data.data;
      }
    },
    onSuccess: (newBoard) => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards'] });
      setBoardModal({isOpen: false, isEdit: false, data: null});
      if (!boardModal.isEdit && newBoard?.id) setActiveBoardId(newBoard.id);
    }
  });

  const deleteBoardMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/kanban/boards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards'] });
      setActiveBoardId(null);
    }
  });

  // --- COLUMNS ---
  const saveColumnMutation = useMutation({
    mutationFn: async (vars: { id?: string, boardId?: string, title: string, color: string, sortOrder?: number }) => {
      if (vars.id) {
        const { data } = await api.patch(`/kanban/columns/${vars.id}`, { title: vars.title, color: vars.color });
        return data.data;
      } else {
        const { data } = await api.post(`/kanban/boards/${vars.boardId}/columns`, { title: vars.title, color: vars.color, sortOrder: vars.sortOrder });
        return data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards', activeBoardId] });
      setColumnModal({isOpen: false, isEdit: false, boardId: '', data: null});
    }
  });

  const deleteColumnMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/kanban/columns/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards', activeBoardId] });
    }
  });

  // --- CARDS ---
  const saveCardMutation = useMutation({
    mutationFn: async (vars: { id?: string, columnId?: string, title: string, description: string, priority: string, dueDate: string | null, sortOrder?: number }) => {
      if (vars.id) {
        const { data } = await api.patch(`/kanban/cards/${vars.id}`, { title: vars.title, description: vars.description, priority: vars.priority, dueDate: vars.dueDate });
        return data.data;
      } else {
        const { data } = await api.post(`/kanban/columns/${vars.columnId}/cards`, { title: vars.title, description: vars.description, priority: vars.priority, dueDate: vars.dueDate, sortOrder: vars.sortOrder });
        return data.data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards', activeBoardId] });
      setCardModal({isOpen: false, isEdit: false, columnId: '', data: null});
    }
  });

  const deleteCardMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/kanban/cards/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards', activeBoardId] });
    }
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return '#ef4444'; // red-500
      case 'high': return '#f59e0b'; // amber-500
      case 'medium': return '#3b82f6'; // blue-500
      default: return '#6b7280'; // gray-500
    }
  };

  const [localBoard, setLocalBoard] = useState<KanbanBoard | null>(null);
  const [activeDragCard, setActiveDragCard] = useState<KanbanCard | null>(null);
  
  useEffect(() => {
    if (activeBoard) {
      setLocalBoard(JSON.parse(JSON.stringify(activeBoard)));
    } else {
      setLocalBoard(null);
    }
  }, [activeBoard]);

  const moveCardMutation = useMutation({
    mutationFn: async (vars: any) => {
      const { data } = await api.patch('/kanban/cards/move', vars);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kanban', 'boards', activeBoardId] });
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  if (isLoadingBoards || (activeBoardId && isLoadingBoard)) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted">
        <Loader2 size={32} className="animate-spin mr-3" />
        Loading Board...
      </div>
    );
  }

  if (!boardsData || boardsData.length === 0) {
    return (
      <div className="flex flex-col h-full w-full items-center justify-center text-muted gap-4">
        <p className="text-lg">You don't have any projects yet.</p>
        <button 
          onClick={() => setBoardModal({isOpen: true, isEdit: false, data: {title: '', description: ''}})}
          className="bg-accent-blue hover:bg-accent-blue-hover text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-lg shadow-accent-blue/20 flex items-center gap-2"
        >
          <Plus size={18} />
          Create First Project
        </button>
        {/* Modals are rendered at the bottom, so they still work here */}
      </div>
    );
  }



  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const { data } = active;
    if (data.current?.type === 'Card') {
      setActiveDragCard(data.current.card);
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    setLocalBoard((prev) => {
      if (!prev) return prev;
      const board = JSON.parse(JSON.stringify(prev));
      let activeColumnIndex = -1;
      let overColumnIndex = -1;
      let activeCardIndex = -1;
      let overCardIndex = -1;

      // Find indices
      board.columns.forEach((col: any, colIdx: number) => {
        if (col.id === overId) overColumnIndex = colIdx; // if dropped directly on column
        col.cards.forEach((card: any, cardIdx: number) => {
          if (card.id === activeId) {
            activeColumnIndex = colIdx;
            activeCardIndex = cardIdx;
          }
          if (card.id === overId) {
            overColumnIndex = colIdx;
            overCardIndex = cardIdx;
          }
        });
      });

      if (activeColumnIndex === -1 || overColumnIndex === -1) return prev;
      if (activeColumnIndex === overColumnIndex && activeCardIndex === overCardIndex) return prev;

      const activeCard = board.columns[activeColumnIndex].cards[activeCardIndex];
      board.columns[activeColumnIndex].cards.splice(activeCardIndex, 1);
      
      if (overCardIndex !== -1) {
        board.columns[overColumnIndex].cards.splice(overCardIndex, 0, activeCard);
      } else {
        board.columns[overColumnIndex].cards.push(activeCard);
      }

      // Update sortOrders
      board.columns[activeColumnIndex].cards.forEach((c: any, i: number) => c.sortOrder = i);
      if (activeColumnIndex !== overColumnIndex) {
        board.columns[overColumnIndex].cards.forEach((c: any, i: number) => c.sortOrder = i);
      }

      return board;
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragCard(null);
    const { active, over } = event;
    if (!over) {
       queryClient.invalidateQueries({ queryKey: ['kanban', 'boards', activeBoardId] });
       return;
    }

    if (localBoard) {
      // Find where card is now in localBoard
      let currentColumnId = '';
      let currentColumnCards: any[] = [];
      let sourceColumnId = active.data.current?.card?.columnId || '';
      
      // Let's rely on localBoard's current state which was updated in dragOver
      for (const col of localBoard.columns) {
        if (col.cards.some((c: any) => c.id === active.id)) {
          currentColumnId = col.id;
          currentColumnCards = col.cards;
          break;
        }
      }

      if (currentColumnId) {
        const payload = {
          cardId: active.id as string,
          toColumnId: currentColumnId,
          affectedColumns: [
            {
              columnId: currentColumnId,
              cards: currentColumnCards.map((c, i) => ({ id: c.id, sortOrder: i }))
            }
          ]
        };
        
        // If it moved columns, add the source column too
        if (sourceColumnId && sourceColumnId !== currentColumnId) {
           const sourceCol = localBoard.columns.find(c => c.id === sourceColumnId);
           if (sourceCol) {
             payload.affectedColumns.push({
               columnId: sourceColumnId,
               cards: sourceCol.cards.map((c: any, i: number) => ({ id: c.id, sortOrder: i }))
             });
           }
        }

        moveCardMutation.mutate(payload);
      }
    }
  };


  const board = localBoard || activeBoard;


  return (
    <div className="flex flex-col h-full w-full bg-background p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <header className="flex justify-between items-end mb-8 z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">{board?.title || 'Project'}</h1>
            <p className="text-muted mt-2">{board?.description || 'Manage tasks and track progress.'}</p>
          </div>
          {board && (
            <div className="relative ml-2">
              <button 
                onClick={() => setActiveDropdownId(activeDropdownId === `board-${board.id}` ? null : `board-${board.id}`)}
                className="text-muted hover:text-foreground hover:bg-surface p-2 rounded-lg transition-colors"
              >
                <MoreHorizontal size={24} />
              </button>
              {activeDropdownId === `board-${board.id}` && (
                <div className="absolute left-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
                  <button 
                    onClick={() => { setBoardModal({isOpen: true, isEdit: true, data: board}); setActiveDropdownId(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
                  >
                    <Edit size={14} /> Edit Board
                  </button>
                  <button 
                    onClick={async () => { if(await confirm('Delete board?')) deleteBoardMutation.mutate(board.id); setActiveDropdownId(null); }}
                    className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">

          <select 
            value={activeBoardId || ''}
            onChange={(e) => setActiveBoardId(e.target.value)}
            className="bg-surface border border-border px-4 py-2 rounded-xl text-sm font-medium focus:outline-none"
          >
            {boardsData.map(b => (
              <option key={b.id} value={b.id}>{b.title}</option>
            ))}
          </select>
          <button 
            onClick={() => setBoardModal({isOpen: true, isEdit: false, data: {title: '', description: ''}})}
            className="bg-accent-blue hover:bg-accent-blue-hover text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm flex items-center gap-2"
          >
            <Plus size={18} />
            New Project
          </button>
        </div>
      </header>


      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden z-10 pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={handleDragStart} onDragOver={handleDragOver} onDragEnd={handleDragEnd}>
        <div className="flex gap-6 h-full items-start min-w-max pr-8">

          
          {board?.columns?.map((column: KanbanColumn) => (
            <div key={column.id} className="w-80 flex flex-col max-h-full">
              
              {/* Column Header */}
              <div className="flex justify-between items-center mb-4 px-1 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: column.color }}></div>
                  <h3 className="font-semibold text-foreground text-sm uppercase tracking-wider">{column.title}</h3>
                  <span className="text-xs bg-surface border border-border px-2 py-0.5 rounded-md text-muted font-medium ml-1">
                    {column.cards?.length || 0}
                  </span>
                </div>
                <div className="relative">
                  <button 
                    onClick={() => setActiveDropdownId(activeDropdownId === `col-${column.id}` ? null : `col-${column.id}`)}
                    className="text-muted hover:text-foreground transition-colors p-1 rounded-md hover:bg-surface"
                  >
                    <MoreHorizontal size={16} />
                  </button>
                  {activeDropdownId === `col-${column.id}` && (
                    <div className="absolute right-0 mt-2 w-36 bg-surface border border-border rounded-xl shadow-lg overflow-hidden z-20">
                      <button 
                        onClick={() => { setColumnModal({isOpen: true, isEdit: true, boardId: board.id, data: column}); setActiveDropdownId(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface-hover flex items-center gap-2"
                      >
                        <Edit size={14} /> Edit
                      </button>
                      <button 
                        onClick={async () => { if(await confirm('Delete column?')) deleteColumnMutation.mutate(column.id); setActiveDropdownId(null); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-500/10 flex items-center gap-2"
                      >
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-3 p-1 custom-scrollbar">
                <SortableContext items={column.cards?.map((c: any) => c.id) || []} strategy={verticalListSortingStrategy}>
                  {column.cards?.map((card: KanbanCard) => (
                    <SortableCard 
                      key={card.id} 
                      card={{...card, columnId: column.id}} 
                      activeDropdownId={activeDropdownId}
                      setActiveDropdownId={setActiveDropdownId}
                      setCardModal={setCardModal}
                      deleteCardMutation={deleteCardMutation}
                      getPriorityColor={getPriorityColor}
                    />
                  ))}
                </SortableContext>

                <button 
                  onClick={() => setCardModal({isOpen: true, isEdit: false, columnId: column.id, data: {title: '', description: '', priority: 'medium', dueDate: '', sortOrder: column.cards?.length || 0}})}
                  className="w-full py-3 flex items-center justify-center gap-2 text-muted hover:text-foreground hover:bg-surface-glass border border-dashed border-border rounded-xl transition-colors text-sm font-medium mt-2"
                >
                  <Plus size={16} />
                  Add Card
                </button>
              </div>

            </div>
          ))}

          {board && (
            <div className="w-80 shrink-0">
              <button 
                onClick={() => setColumnModal({isOpen: true, isEdit: false, boardId: board.id, data: {title: '', color: '#6366f1', sortOrder: board.columns?.length || 0}})}
                className="w-full py-3 flex items-center justify-center gap-2 text-muted hover:text-foreground hover:bg-surface-glass border border-dashed border-border rounded-xl transition-colors text-sm font-medium"
              >
                <Plus size={16} />
                Add Column
              </button>
            </div>
          )}


        </div>
        <DragOverlay>
          {activeDragCard ? <SortableCard card={activeDragCard} getPriorityColor={getPriorityColor} /> : null}
        </DragOverlay>
        </DndContext>
      </div>

      {/* --- MODALS --- */}
      
      {/* Board Modal */}
      <Modal isOpen={boardModal.isOpen} onClose={() => setBoardModal({...boardModal, isOpen: false})} title={boardModal.isEdit ? "Edit Project" : "New Project"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Project Name</label>
            <input 
              type="text" 
              value={boardModal.data?.title || ''}
              onChange={e => setBoardModal({...boardModal, data: {...boardModal.data, title: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. Q3 Marketing Campaign"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Description (Optional)</label>
            <textarea 
              value={boardModal.data?.description || ''}
              onChange={e => setBoardModal({...boardModal, data: {...boardModal.data, description: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none min-h-[80px]"
              placeholder="Brief description of the project"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setBoardModal({...boardModal, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => saveBoardMutation.mutate({ id: boardModal.isEdit ? boardModal.data.id : undefined, title: boardModal.data.title, description: boardModal.data.description })}
              disabled={saveBoardMutation.isPending || !boardModal.data?.title}
              className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
            >
              {saveBoardMutation.isPending ? 'Saving...' : (boardModal.isEdit ? 'Save Changes' : 'Create Project')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Column Modal */}
      <Modal isOpen={columnModal.isOpen} onClose={() => setColumnModal({...columnModal, isOpen: false})} title={columnModal.isEdit ? "Edit Column" : "New Column"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Column Name</label>
            <input 
              type="text" 
              value={columnModal.data?.title || ''}
              onChange={e => setColumnModal({...columnModal, data: {...columnModal.data, title: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. In Progress"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Color Theme</label>
            <input 
              type="color" 
              value={columnModal.data?.color || '#6366f1'}
              onChange={e => setColumnModal({...columnModal, data: {...columnModal.data, color: e.target.value}})}
              className="w-16 h-10 bg-transparent cursor-pointer rounded-lg border-none"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setColumnModal({...columnModal, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => saveColumnMutation.mutate({ id: columnModal.isEdit ? columnModal.data.id : undefined, boardId: columnModal.boardId, title: columnModal.data.title, color: columnModal.data.color, sortOrder: columnModal.data.sortOrder })}
              disabled={saveColumnMutation.isPending || !columnModal.data?.title}
              className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
            >
              {saveColumnMutation.isPending ? 'Saving...' : (columnModal.isEdit ? 'Save Changes' : 'Create Column')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Card Modal */}
      <Modal isOpen={cardModal.isOpen} onClose={() => setCardModal({...cardModal, isOpen: false})} title={cardModal.isEdit ? "Edit Card" : "New Card"}>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Card Title</label>
            <input 
              type="text" 
              value={cardModal.data?.title || ''}
              onChange={e => setCardModal({...cardModal, data: {...cardModal.data, title: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. Design Landing Page"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Description (Optional)</label>
            <textarea 
              value={cardModal.data?.description || ''}
              onChange={e => setCardModal({...cardModal, data: {...cardModal.data, description: e.target.value}})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none min-h-[80px]"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-muted block mb-1">Priority</label>
              <select 
                value={cardModal.data?.priority || 'medium'}
                onChange={e => setCardModal({...cardModal, data: {...cardModal.data, priority: e.target.value}})}
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
                value={cardModal.data?.dueDate ? new Date(cardModal.data.dueDate).toISOString().split('T')[0] : ''}
                onChange={e => setCardModal({...cardModal, data: {...cardModal.data, dueDate: e.target.value || null}})}
                className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              />
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setCardModal({...cardModal, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => saveCardMutation.mutate({ id: cardModal.isEdit ? cardModal.data.id : undefined, columnId: cardModal.columnId, title: cardModal.data.title, description: cardModal.data.description, priority: cardModal.data.priority, dueDate: cardModal.data.dueDate, sortOrder: cardModal.data.sortOrder })}
              disabled={saveCardMutation.isPending || !cardModal.data?.title}
              className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
            >
              {saveCardMutation.isPending ? 'Saving...' : (cardModal.isEdit ? 'Save Changes' : 'Create Card')}
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}

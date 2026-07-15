'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Modal } from '@/components/Modal';
import { useDialog } from '@/components/DialogProvider';
import { 
  FolderPlus, 
  Folder, 
  FileText, 
  MoreVertical, 
  Search, 
  Plus, 
  Bold, 
  Italic, 
  List, 
  Link as LinkIcon,
  Maximize2,
  Loader2,
  Trash2,
  AlertCircle
} from 'lucide-react';
import api from '@/lib/api';

type Note = {
  id: string;
  title: string;
  content: string | null;
  folderId: string | null;
  updatedAt: string;
};

type FolderType = {
  id: string;
  name: string;
  color: string;
};

export default function NotesPage() {
  const queryClient = useQueryClient();
  const { confirm, prompt } = useDialog();
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [folderModal, setFolderModal] = useState({ isOpen: false, name: '', color: '#6366f1' });

  const [editTitle, setEditTitle] = useState('');
  const [editContent, setEditContent] = useState('');
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);


  const { data: foldersResponse, isLoading: isLoadingFolders } = useQuery({
    queryKey: ['folders'],
    queryFn: async () => {
      const { data } = await api.get('/folders');
      return data.data as FolderType[];
    }
  });

  const folders = foldersResponse || [];

  const createFolderMutation = useMutation({
    mutationFn: async (vars: { name: string, color: string }) => {
      const { data } = await api.post('/folders', vars);
      return data.data;
    },
    onSuccess: (newFolder) => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setFolderModal({ isOpen: false, name: '', color: '#6366f1' });
      setActiveFolderId(newFolder.id);
    }
  });

  const deleteFolderMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/folders/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folders'] });
      setActiveFolderId(null);
    }
  });

  const { data: response, isLoading, isError } = useQuery({
    queryKey: ['notes'],
    queryFn: async () => {
      const { data } = await api.get('/notes');
      return data.data as Note[];
    }
  });

  const allNotes = response || [];
  const notes = activeFolderId ? allNotes.filter(n => n.folderId === activeFolderId) : allNotes;
  const activeNote = allNotes.find(n => n.id === activeNoteId);

  const editorRef = useRef<HTMLDivElement>(null);

  // Sync local state when active note changes
  useEffect(() => {
    if (activeNote) {
      setEditTitle(activeNote.title);
      setEditContent(activeNote.content || '');
      if (editorRef.current && editorRef.current.innerHTML !== (activeNote.content || '')) {
        editorRef.current.innerHTML = activeNote.content || '';
      }
    } else {
      setEditTitle('');
      setEditContent('');
      if (editorRef.current) {
        editorRef.current.innerHTML = '';
      }
    }
  }, [activeNoteId, activeNote?.id]);

  const createMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post('/notes', { title: 'Untitled Note', content: '', folderId: activeFolderId });
      return data.data as Note;
    },
    onSuccess: (newNote) => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setActiveNoteId(newNote.id);
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (vars: { id: string, title: string, content: string }) => {
      const { data } = await api.patch(`/notes/${vars.id}`, { title: vars.title, content: vars.content });
      return data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
    }
  });

  // Auto-save logic
  useEffect(() => {
    if (!activeNote) return;
    if (editTitle === activeNote.title && editContent === (activeNote.content || '')) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      updateMutation.mutate({ id: activeNote.id, title: editTitle, content: editContent });
    }, 1000);

    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [editTitle, editContent, activeNote]);

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(dateString));
  };

  const getExcerpt = (content: string | null) => {
    if (!content) return 'No content...';
    return content.substring(0, 50) + (content.length > 50 ? '...' : '');
  };

  return (
    <div className="flex h-full w-full bg-background overflow-hidden">
      
      {/* Notes Sidebar */}
      <div className="w-80 h-full border-r border-border glass flex flex-col shrink-0 z-20">
        <div className="p-4 border-b border-border">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-foreground">Notes</h2>
            <button 
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
              className="w-8 h-8 rounded-lg bg-surface-hover hover:bg-surface flex items-center justify-center text-muted hover:text-foreground transition-colors border border-border disabled:opacity-50"
            >
              {createMutation.isPending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={18} />}
            </button>
          </div>
          
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input 
              type="text" 
              placeholder="Search notes..." 
              className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent-blue/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {/* Folders Section */}
          <div className="mb-6 px-2 mt-2">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-muted uppercase tracking-wider">Folders</h3>
              <button onClick={() => setFolderModal({ ...folderModal, isOpen: true })} className="text-muted hover:text-foreground">
                <FolderPlus size={14} />
              </button>
            </div>
            <div className="space-y-1">
              <button 
                onClick={() => setActiveFolderId(null)} 
                className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-glass transition-colors group ${!activeFolderId ? 'bg-surface-hover text-foreground' : 'text-muted hover:text-foreground'}`}
              >
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-sm font-medium flex-1 text-left">All Notes</span>
              </button>
              {folders.map((folder: FolderType) => (
                <button 
                  key={folder.id} 
                  onClick={() => setActiveFolderId(folder.id)}
                  className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-glass transition-colors group ${activeFolderId === folder.id ? 'bg-surface-hover text-foreground' : 'text-muted hover:text-foreground'}`}
                >
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: folder.color || '#6366f1' }}></div>
                  <span className="text-sm font-medium flex-1 text-left truncate">{folder.name}</span>
                  <span 
                    onClick={async (e) => { e.stopPropagation(); if (await confirm('Delete folder?')) deleteFolderMutation.mutate(folder.id); }}
                    className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-500 transition-opacity"
                  >
                    <Trash2 size={12} />
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notes List */}
          <div className="px-2">
            <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Recent Notes</h3>
            
            {isLoading ? (
              <div className="p-4 flex items-center justify-center text-muted text-sm">
                <Loader2 size={16} className="animate-spin mr-2" /> Loading...
              </div>
            ) : isError ? (
              <div className="p-4 text-xs text-red-500 bg-red-500/10 rounded-xl">
                Failed to load notes.
              </div>
            ) : notes.length === 0 ? (
              <div className="p-4 text-center text-muted text-sm border border-dashed border-border rounded-xl">
                No notes yet. Create one!
              </div>
            ) : (
              <div className="space-y-2">
                {notes.map(note => {
                  const isActive = activeNoteId === note.id;
                  return (
                    <button 
                      key={note.id}
                      onClick={() => setActiveNoteId(note.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                        isActive 
                          ? 'bg-surface-hover border-accent-blue/30 shadow-sm' 
                          : 'bg-transparent border-transparent hover:bg-surface-glass hover:border-border'
                      }`}
                    >
                      <h4 className={`text-sm font-semibold mb-1 truncate ${isActive ? 'text-accent-blue' : 'text-foreground'}`}>
                        {note.title}
                      </h4>
                      <p className="text-xs text-muted truncate mb-2">{getExcerpt(note.content)}</p>
                      <span className="text-[10px] text-muted/60 font-medium">{formatDate(note.updatedAt)}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 h-full flex flex-col relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-accent-blue/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-accent-green/5 rounded-full blur-3xl pointer-events-none"></div>

        {activeNote ? (
          <>
            {/* Editor Toolbar */}
            <div className="h-14 border-b border-border flex items-center justify-between px-6 shrink-0 glass z-10">
              <div className="flex items-center gap-1">
                <button 
                  onClick={() => document.execCommand('bold', false)}
                  className="w-8 h-8 rounded hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <Bold size={16} />
                </button>
                <button 
                  onClick={() => document.execCommand('italic', false)}
                  className="w-8 h-8 rounded hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <Italic size={16} />
                </button>
                <div className="w-px h-4 bg-border mx-2"></div>
                <button 
                  onClick={() => document.execCommand('insertUnorderedList', false)}
                  className="w-8 h-8 rounded hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <List size={16} />
                </button>
                <button 
                  onClick={async () => {
                    const url = await prompt('Enter link URL:');
                    if (url) document.execCommand('createLink', false, url);
                  }}
                  className="w-8 h-8 rounded hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors"
                >
                  <LinkIcon size={16} />
                </button>
              </div>
              
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted/60 font-medium flex items-center gap-2">
                  {updateMutation.isPending && <Loader2 size={12} className="animate-spin" />}
                  {updateMutation.isPending ? 'Saving...' : 'Saved'}
                </span>
                <button className="w-8 h-8 rounded hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground transition-colors">
                  <Maximize2 size={16} />
                </button>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-12 z-10 relative">
              <div className="max-w-3xl mx-auto">
                <input 
                  type="text" 
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="text-4xl font-bold text-foreground bg-transparent border-none outline-none w-full mb-8 placeholder:text-muted/30 focus:ring-0"
                  placeholder="Note Title"
                />
                
                <div className="prose prose-invert max-w-none pb-24">
                  <div 
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setEditContent(e.currentTarget.innerHTML)}
                    className="w-full min-h-[600px] bg-transparent border-none outline-none text-foreground/90 text-lg leading-relaxed focus:ring-0 empty:before:content-['Start_writing...'] empty:before:text-muted/40 cursor-text"
                  />
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted/50 z-10">
            <FileText size={64} className="mb-4 opacity-20" />
            <p className="text-lg font-medium">Select a note or create a new one</p>
          </div>
        )}
      </div>

      {/* Folder Modal */}
      <Modal isOpen={folderModal.isOpen} onClose={() => setFolderModal({...folderModal, isOpen: false})} title="New Folder">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Folder Name</label>
            <input 
              type="text" 
              value={folderModal.name}
              onChange={e => setFolderModal({...folderModal, name: e.target.value})}
              className="w-full bg-surface border border-border rounded-lg px-4 py-2 text-foreground focus:border-accent-blue focus:outline-none"
              placeholder="e.g. Personal"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-muted block mb-1">Color Theme</label>
            <input 
              type="color" 
              value={folderModal.color}
              onChange={e => setFolderModal({...folderModal, color: e.target.value})}
              className="w-16 h-10 bg-transparent cursor-pointer rounded-lg border-none"
            />
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => setFolderModal({...folderModal, isOpen: false})} className="px-4 py-2 text-muted hover:text-foreground font-medium">Cancel</button>
            <button 
              onClick={() => createFolderMutation.mutate({ name: folderModal.name, color: folderModal.color })}
              disabled={createFolderMutation.isPending || !folderModal.name}
              className="bg-accent-blue text-white px-6 py-2 rounded-lg font-medium hover:bg-accent-blue-hover transition-colors disabled:opacity-50"
            >
              {createFolderMutation.isPending ? 'Saving...' : 'Create Folder'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

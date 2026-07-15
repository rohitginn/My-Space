'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, FileText, CheckSquare, Layers, X, Loader2 } from 'lucide-react';
import api from '@/lib/api';

type SearchResult = {
  notes: any[];
  todos: any[];
  cards: any[];
};

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ notes: [], todos: [], cards: [] });
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle Cmd+K / Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResults({ notes: [], todos: [], cards: [] });
    }
  }, [isOpen]);

  // Handle search
  useEffect(() => {
    if (!query.trim()) {
      setResults({ notes: [], todos: [], cards: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const { data } = await api.get(`/search?q=${encodeURIComponent(query)}`);
        setResults(data.data);
      } catch (error) {
        console.error('Search failed', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleNavigate = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  if (!isOpen) return null;

  const hasResults = results.notes.length > 0 || results.todos.length > 0 || results.cards.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-32 px-4 sm:px-6">
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)}></div>
      
      <div className="relative w-full max-w-2xl bg-surface border border-border rounded-xl shadow-2xl overflow-hidden glass animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center px-4 py-4 border-b border-border">
          <Search size={20} className="text-muted mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, tasks, or projects..."
            className="flex-1 bg-transparent border-none outline-none text-foreground text-lg placeholder:text-muted/50"
          />
          {isLoading && <Loader2 size={18} className="animate-spin text-muted" />}
          <div className="flex items-center gap-2 ml-4">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md bg-surface-hover border border-border text-[10px] font-medium text-muted">ESC</kbd>
            <button onClick={() => setIsOpen(false)} className="text-muted hover:text-foreground">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!query.trim() ? (
            <div className="p-8 text-center text-muted">
              <p>Type to start searching...</p>
              <p className="text-xs mt-2 opacity-60">Pro tip: You can open this anytime with Cmd+K</p>
            </div>
          ) : !hasResults && !isLoading ? (
            <div className="p-8 text-center text-muted">No results found for "{query}"</div>
          ) : (
            <div className="space-y-4 py-2">
              {results.notes.length > 0 && (
                <div>
                  <h3 className="px-4 text-xs font-semibold text-muted uppercase tracking-wider mb-2">Notes</h3>
                  <div className="space-y-1">
                    {results.notes.map(note => (
                      <button key={note.id} onClick={() => handleNavigate('/notes')} className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors text-left group">
                        <FileText size={16} className="text-accent-blue mr-3 group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{note.title}</p>
                          {note.content && <p className="text-xs text-muted truncate max-w-md">{note.content.substring(0, 50)}...</p>}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.todos.length > 0 && (
                <div>
                  <h3 className="px-4 text-xs font-semibold text-muted uppercase tracking-wider mb-2 mt-4">Tasks</h3>
                  <div className="space-y-1">
                    {results.todos.map(todo => (
                      <button key={todo.id} onClick={() => handleNavigate('/tasks')} className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors text-left group">
                        <CheckSquare size={16} className="text-accent-green mr-3 group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{todo.title}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {results.cards.length > 0 && (
                <div>
                  <h3 className="px-4 text-xs font-semibold text-muted uppercase tracking-wider mb-2 mt-4">Project Cards</h3>
                  <div className="space-y-1">
                    {results.cards.map(card => (
                      <button key={card.id} onClick={() => handleNavigate('/projects')} className="w-full flex items-center px-4 py-3 rounded-lg hover:bg-surface-hover transition-colors text-left group">
                        <Layers size={16} className="text-amber-500 mr-3 group-hover:scale-110 transition-transform" />
                        <div>
                          <p className="text-sm font-medium text-foreground">{card.title}</p>
                          <p className="text-xs text-muted">Priority: {card.priority}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

'use client';

import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';

export type Workspace = { id: string; name: string; slug: string; description: string | null; accentColor: string; type: 'team' | 'study_group' | 'client'; role: string; memberCount: number; inviteCode: string };
type WorkspaceContextValue = { activeWorkspace: Workspace | null; workspaces: Workspace[]; isLoading: boolean; isPersonalMode: boolean; switchWorkspace: (id: string | null) => void; refreshWorkspaces: () => Promise<void> };
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => typeof window === 'undefined' ? null : localStorage.getItem('active-workspace'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspaces = async () => {
    const { data } = await api.get('/workspaces');
    setWorkspaces(data.data ?? []);
  };
  useEffect(() => {
    const load = async () => {
      try { await refreshWorkspaces(); } catch { setWorkspaces([]); } finally { setIsLoading(false); }
    };
    void load();
  }, []);
  const switchWorkspace = (id: string | null) => {
    setActiveId(id);
    if (id) localStorage.setItem('active-workspace', id);
    else localStorage.removeItem('active-workspace');
  };
  const activeWorkspace = workspaces.find((workspace) => workspace.id === activeId) ?? null;
  const value = useMemo(() => ({ activeWorkspace, workspaces, isLoading, isPersonalMode: activeWorkspace === null, switchWorkspace, refreshWorkspaces }), [activeWorkspace, workspaces, isLoading]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}

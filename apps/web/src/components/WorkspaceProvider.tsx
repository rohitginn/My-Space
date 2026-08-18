'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { usePathname } from 'next/navigation';
import api from '@/lib/api';

export type Workspace = { id: string; name: string; slug: string; description: string | null; accentColor: string; type: 'team' | 'study_group' | 'client'; role: string; memberCount: number; inviteCode: string };
type WorkspaceContextValue = { activeWorkspace: Workspace | null; workspaces: Workspace[]; isLoading: boolean; isPersonalMode: boolean; switchWorkspace: (id: string | null) => void; refreshWorkspaces: (signal?: AbortSignal) => Promise<void> };
const WorkspaceContext = createContext<WorkspaceContextValue | undefined>(undefined);
const publicRoutes = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);
const isPublicPath = (path: string) => publicRoutes.has(path) || path.startsWith('/co-space/join/');

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = isPublicPath(pathname);
  const hasToken = typeof window !== 'undefined' && Boolean(localStorage.getItem('accessToken'));
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeId, setActiveId] = useState<string | null>(() => typeof window === 'undefined' ? null : localStorage.getItem('active-workspace'));
  const [isLoading, setIsLoading] = useState(true);

  const refreshWorkspaces = useCallback(async (signal?: AbortSignal) => {
    const { data } = await api.get('/workspaces', signal ? { signal } : undefined);
    if (signal?.aborted) return;
    setWorkspaces(data.data ?? []);
  }, []);
  useEffect(() => {
    if (isPublicRoute || !hasToken) {
      return;
    }

    let active = true;
    const controller = new AbortController();
    const load = async () => {
      try {
        await refreshWorkspaces(controller.signal);
      } catch {
        if (active) setWorkspaces([]);
      } finally {
        if (active) setIsLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
      controller.abort();
    };
  }, [hasToken, isPublicRoute, pathname, refreshWorkspaces]);
  const switchWorkspace = (id: string | null) => {
    setActiveId(id);
    if (id) localStorage.setItem('active-workspace', id);
    else localStorage.removeItem('active-workspace');
  };
  const routeWorkspaceId = pathname.match(/^\/co-space\/([^/]+)/)?.[1] ?? null;
  const resolvedActiveId = routeWorkspaceId && workspaces.some((workspace) => workspace.id === routeWorkspaceId) ? routeWorkspaceId : activeId;
  const activeWorkspace = workspaces.find((workspace) => workspace.id === resolvedActiveId) ?? null;
  const visibleLoading = isPublicRoute || !hasToken ? false : isLoading;
  const value = useMemo(() => ({ activeWorkspace, workspaces, isLoading: visibleLoading, isPersonalMode: activeWorkspace === null, switchWorkspace, refreshWorkspaces }), [activeWorkspace, workspaces, refreshWorkspaces, visibleLoading]);
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error('useWorkspace must be used inside WorkspaceProvider');
  return context;
}

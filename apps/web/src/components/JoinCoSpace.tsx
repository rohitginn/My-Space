'use client';

import { useState } from 'react';
import { Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { useWorkspace } from './WorkspaceProvider';

export function JoinCoSpace({ inviteCode }: { inviteCode: string }) {
  const router = useRouter();
  const { refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  const join = async () => {
    setPending(true);
    setError('');
    try {
      const { data } = await api.post(`/workspaces/join/${inviteCode}`);
      await refreshWorkspaces();
      switchWorkspace(data.data.id);
      router.push(`/co-space/${data.data.id}/canvas`);
    } catch (requestError) {
      const response = (requestError as { response?: { data?: { error?: { message?: string } } } }).response;
      setError(response?.data?.error?.message || 'This invite is no longer available. Ask the workspace owner for a new link.');
    } finally {
      setPending(false);
    }
  };

  return (
    <main className="flex min-h-full items-center justify-center px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
        <Users className="mx-auto text-accent-blue" size={34} />
        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Join this Co-Space</h1>
        <p className="mt-2 text-sm leading-6 text-muted">You’re invited to collaborate on shared canvases, projects, and notes.</p>
        {error && <p role="alert" className="mt-5 rounded-lg bg-red-500/10 px-3 py-2 text-left text-sm text-red-600">{error}</p>}
        <button onClick={join} disabled={pending} className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 text-sm font-semibold text-white hover:bg-accent-blue-hover disabled:opacity-50 cursor-pointer">
          {pending && <Loader2 size={16} className="animate-spin" />}Join Co-Space
        </button>
        <button onClick={() => router.push('/co-space')} className="mt-3 text-sm font-medium text-muted hover:text-foreground cursor-pointer">Go to Co-Spaces</button>
      </section>
    </main>
  );
}

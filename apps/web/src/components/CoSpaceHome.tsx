'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, FileText, Layout, Loader2, Palette, Plus, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import api from '@/lib/api';
import { Modal } from './Modal';
import { useWorkspace, Workspace } from './WorkspaceProvider';

export function CoSpaceHome() {
  const { workspaces, refreshWorkspaces, switchWorkspace } = useWorkspace();
  const [mode, setMode] = useState<'create' | 'join' | null>(null);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!mode) return;

    setPending(true);
    setError('');
    try {
      const { data } = mode === 'create'
        ? await api.post('/workspaces', { name: name.trim(), accentColor: '#0f766e' })
        : await api.post(`/workspaces/join/${inviteCode.trim()}`);
      await refreshWorkspaces();
      switchWorkspace(data.data.id);
      setMode(null);
      setName('');
      setInviteCode('');
    } catch (requestError) {
      const response = (requestError as { response?: { data?: { error?: { message?: string } } } }).response;
      setError(response?.data?.error?.message || 'The Co-Space service is unavailable. Check that the API is running and try again.');
    } finally {
      setPending(false);
    }
  };
  const closeModal = () => {
    if (pending) return;
    setMode(null);
    setError('');
  };
  return <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:px-10"><header className="mb-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-accent-blue">Collaborative workspaces</p><h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Bring a small team into focus.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">A shared place for canvases, project boards, and notes that keeps the team moving together.</p></div>    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => setMode('join')}
        className="inline-flex h-10 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
      >
        Join with code
      </button>
      <button
        onClick={() => setMode('create')}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white hover:bg-accent-blue-hover shadow-xs transition-all active:scale-95 cursor-pointer"
      >
        <Plus size={17} />
        New Co-Space
      </button>
    </div>
  </header>
  {workspaces.length === 0 ? (
    <section className="rounded-2xl border border-dashed border-border bg-surface p-8 text-center sm:p-10">
      <Users className="mx-auto text-muted" size={34} />
      <h2 className="mt-4 text-lg font-semibold">No Co-Spaces yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
        Create a place for your next study session, project team, or client collaboration.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={() => setMode('create')} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent-blue px-4 text-sm font-semibold text-white hover:bg-accent-blue-hover cursor-pointer"><Plus size={16} />Create a Co-Space</button>
        <button onClick={() => setMode('join')} className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium text-foreground hover:bg-surface-hover cursor-pointer">Join with an invite</button>
      </div>
    </section>
  ) : (
    <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {workspaces.map((workspace) => (
        <WorkspaceTile key={workspace.id} workspace={workspace} onSelect={() => switchWorkspace(workspace.id)} />
      ))}
    </section>
  )}
  <Modal isOpen={mode !== null} onClose={closeModal} title={mode === 'create' ? 'Create a Co-Space' : 'Join a Co-Space'}>
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="workspace-input">
          {mode === 'create' ? 'Workspace name' : 'Invite code'}
        </label>
        <input
          id="workspace-input"
          autoFocus
          value={mode === 'create' ? name : inviteCode}
          onChange={(event) => (mode === 'create' ? setName(event.target.value) : setInviteCode(event.target.value))}
          placeholder={mode === 'create' ? 'Monday Studio' : 'Paste the invitation code'}
          className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none focus:border-accent-blue"
        />
      </div>
      {error && <p role="alert" className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button
        disabled={pending || (mode === 'create' ? !name.trim() : !inviteCode.trim())}
        className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 text-sm font-semibold text-white shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer"
      >
        {pending && <Loader2 size={16} className="animate-spin" />}
        {mode === 'create' ? 'Create Co-Space' : 'Join Co-Space'}
      </button>
    </form>
  </Modal>
</div>;
}

function WorkspaceTile({ workspace, onSelect }: { workspace: Workspace; onSelect: () => void }) {
  return (
    <motion.article whileHover={{ backgroundColor: 'var(--surface-hover)' }} className="rounded-2xl border border-border bg-surface p-5 transition-colors">
      <div className="flex items-start justify-between gap-4">
        <span className="h-3 w-3 rounded-full" style={{ backgroundColor: workspace.accentColor }} />
        <span className="text-xs text-muted font-medium">{workspace.memberCount} members</span>
      </div>
      <h2 className="mt-6 text-xl font-semibold text-foreground">{workspace.name}</h2>
      <p className="mt-2 min-h-10 text-sm leading-5 text-muted">{workspace.description || 'A shared place to plan, sketch, and move work forward.'}</p>
      <div className="mt-6 flex items-center justify-between gap-3">
        <span className="text-xs font-medium capitalize text-muted">{workspace.role} · {workspace.memberCount} {workspace.memberCount === 1 ? 'member' : 'members'}</span>
        <Link onClick={onSelect} href={`/co-space/${workspace.id}/canvas`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue-hover">
          Open workspace <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="mt-5 grid grid-cols-3 gap-2 border-t border-border pt-4">
        <QuickLink href={`/co-space/${workspace.id}/canvas`} icon={Palette} label="Canvas" onClick={onSelect} />
        <QuickLink href={`/co-space/${workspace.id}/projects`} icon={Layout} label="Projects" onClick={onSelect} />
        <QuickLink href={`/co-space/${workspace.id}/notes`} icon={FileText} label="Notes" onClick={onSelect} />
      </div>
    </motion.article>
  );
}

function QuickLink({ href, icon: Icon, label, onClick }: { href: string; icon: typeof Palette; label: string; onClick: () => void }) {
  return <Link onClick={onClick} href={href} className="flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-medium text-muted hover:bg-surface-hover hover:text-foreground"><Icon size={14} />{label}</Link>;
}

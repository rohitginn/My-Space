'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Check, Copy, FileText, Layout, Loader2, Palette, Plus, Share2, Users } from 'lucide-react';
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
  const [shareWorkspace, setShareWorkspace] = useState<Workspace | null>(null);
  const [copied, setCopied] = useState(false);
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
      if (mode === 'create') setShareWorkspace(data.data as Workspace);
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
  const shareLink = shareWorkspace && typeof window !== 'undefined'
    ? `${window.location.origin}/co-space/join/${shareWorkspace.inviteCode}`
    : '';
  const copyInvite = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError('Copy is unavailable here. Select the invite link and copy it manually.');
    }
  };
  const openShare = (workspace: Workspace) => {
    setCopied(false);
    setShareWorkspace(workspace);
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
        <WorkspaceTile key={workspace.id} workspace={workspace} onSelect={() => switchWorkspace(workspace.id)} onShare={() => openShare(workspace)} />
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
  <Modal isOpen={shareWorkspace !== null} onClose={() => setShareWorkspace(null)} title="Share this Co-Space">
    {shareWorkspace && (
      <div className="space-y-5">
        <div>
          <p className="text-sm text-muted">Invite teammates with this code or link.</p>
          <p className="mt-1 text-lg font-semibold text-foreground">{shareWorkspace.name}</p>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="invite-code">Invite code</label>
          <div className="flex items-center gap-2">
            <input id="invite-code" readOnly value={shareWorkspace.inviteCode} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 font-mono text-sm text-foreground" />
            <button type="button" onClick={() => { void navigator.clipboard.writeText(shareWorkspace.inviteCode); }} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-hover" aria-label="Copy invite code"><Copy size={16} />Copy</button>
          </div>
        </div>
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted" htmlFor="invite-link">Invite link</label>
          <div className="flex items-center gap-2">
            <input id="invite-link" readOnly value={shareLink} className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-xs text-foreground" />
            <button type="button" onClick={() => { void copyInvite(); }} className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl bg-accent-blue px-3 text-sm font-semibold text-white hover:bg-accent-blue-hover" aria-label="Copy invite link">{copied ? <Check size={16} /> : <Copy size={16} />}{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        </div>
        <p className="text-xs leading-5 text-muted">Anyone with the invite can join while this Co-Space has room.</p>
      </div>
    )}
  </Modal>
</div>;
}

function WorkspaceTile({ workspace, onSelect, onShare }: { workspace: Workspace; onSelect: () => void; onShare: () => void }) {
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
        <div className="flex items-center gap-3">
          <button type="button" onClick={onShare} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted hover:text-foreground"><Share2 size={15} />Share</button>
          <Link onClick={onSelect} href={`/co-space/${workspace.id}/canvas`} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-accent-blue hover:text-accent-blue-hover">
            Open workspace <ArrowUpRight size={16} />
          </Link>
        </div>
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

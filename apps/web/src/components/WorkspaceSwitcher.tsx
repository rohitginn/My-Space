'use client';

import { Check, ChevronDown, LockKeyhole, Plus, Users } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';
import { useWorkspace } from './WorkspaceProvider';

export function WorkspaceSwitcher({ collapsed = false, onNavigate }: { collapsed?: boolean; onNavigate?: () => void }) {
  const { activeWorkspace, workspaces, switchWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const label = activeWorkspace?.name ?? 'My Space';
  const choose = (id: string | null) => { switchWorkspace(id); setIsOpen(false); onNavigate?.(); };
  if (collapsed) return <button onClick={() => setIsOpen(!isOpen)} className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl text-foreground hover:bg-surface-hover" title={label}><Users size={18} /></button>;
  return (
    <div className="relative px-4">
      <button onClick={() => setIsOpen((value) => !value)} aria-expanded={isOpen} className="touch-target flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-surface-hover">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-hover text-accent-blue"><Users size={17} /></span>
        <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{label}</span><span className="block text-[11px] text-muted">{activeWorkspace ? 'Co-Space' : 'Personal workspace'}</span></span>
        <ChevronDown size={15} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      <AnimatePresence>
        {isOpen && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.16 }} className="absolute left-4 right-4 top-[calc(100%+8px)] z-40 overflow-hidden rounded-xl border border-border bg-surface p-1 shadow-[0_12px_24px_rgb(15_23_42/0.12)]">
          <button onClick={() => choose(null)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-hover"><LockKeyhole size={15} className="text-muted" /><span className="flex-1 text-sm font-medium">My Space</span>{!activeWorkspace && <Check size={15} className="text-accent-green" />}</button>
          {workspaces.map((workspace) => <button key={workspace.id} onClick={() => choose(workspace.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-surface-hover"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: workspace.accentColor }} /><span className="flex-1 truncate text-sm font-medium">{workspace.name}</span>{activeWorkspace?.id === workspace.id && <Check size={15} className="text-accent-green" />}</button>)}
          <Link href="/co-space" onClick={() => { setIsOpen(false); onNavigate?.(); }} className="mt-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-accent-blue hover:bg-surface-hover"><Plus size={16} />Manage Co-Spaces</Link>
        </motion.div>}
      </AnimatePresence>
    </div>
  );
}

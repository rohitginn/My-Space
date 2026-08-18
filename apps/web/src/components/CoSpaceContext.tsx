'use client';

import Link from 'next/link';
import { PlugZap, Settings } from 'lucide-react';
import { useWorkspace } from './WorkspaceProvider';

const links = [
  { label: 'Canvas', segment: 'canvas' },
  { label: 'Projects', segment: 'projects' },
  { label: 'Notes', segment: 'notes' },
  { label: 'Members', segment: 'members' },
];

export function CoSpaceContext({ workspaceId, current }: { workspaceId: string; current: string }) {
  const { workspaces } = useWorkspace();
  const workspace = workspaces.find((item) => item.id === workspaceId);

  return (
    <div className="mb-7 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: workspace?.accentColor || 'var(--accent-blue)' }}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{workspace?.name || 'Co-Space'}</p>
          <p className="text-xs text-muted">Shared workspace</p>
        </div>
      </div>
      <nav aria-label="Co-Space sections" className="flex gap-1 overflow-x-auto">
        {links.map((link) => {
          const active = current === link.segment;
          return (
            <Link
              key={link.segment}
              href={`/co-space/${workspaceId}/${link.segment}`}
              aria-current={active ? 'page' : undefined}
              className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                active ? 'bg-surface-hover text-foreground' : 'text-muted hover:bg-surface-hover hover:text-foreground'
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        <Link
          href={`/co-space/${workspaceId}/integrations`}
          aria-label="Open workspace integrations"
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground ${current === 'integrations' ? 'bg-surface-hover text-accent-blue' : ''}`}
        >
          <PlugZap size={16} aria-hidden="true" />
        </Link>
        <Link
          href={`/co-space/${workspaceId}/settings`}
          aria-label="Open workspace settings"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
        >
          <Settings size={16} aria-hidden="true" />
        </Link>
      </nav>
    </div>
  );
}

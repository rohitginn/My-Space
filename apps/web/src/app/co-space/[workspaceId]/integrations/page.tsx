'use client';

import { use, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Check, FolderOpen, GitBranch, Loader2, Mail, MessageSquare, PlugZap, ShieldCheck, Unplug } from 'lucide-react';

import api from '@/lib/api';
import { CoSpaceContext } from '@/components/CoSpaceContext';
import { useWorkspace } from '@/components/WorkspaceProvider';

type Provider = {
  slug: string;
  name: string;
  description: string;
  capabilities: string[];
  configured: boolean;
  requiredEnvironment: string[];
};

type InstalledIntegration = {
  id: string;
  provider: string;
  status: string;
  externalAccountName: string | null;
  scopes: string[];
  updatedAt: string;
};

type IntegrationResponse = {
  canManage: boolean;
  catalog: Provider[];
  planned: Array<{ slug: string; name: string; description: string }>;
  installed: InstalledIntegration[];
};

const providerIcons = {
  gmail: Mail,
  slack: MessageSquare,
  github: GitBranch,
  'google-calendar': CalendarDays,
  'google-drive': FolderOpen,
} as const;

function ProviderIcon({ slug }: { slug: string }) {
  const Icon = providerIcons[slug as keyof typeof providerIcons] ?? PlugZap;
  return <Icon size={22} strokeWidth={1.7} aria-hidden="true" />;
}

export default function WorkspaceIntegrationsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const { workspaces } = useWorkspace();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const result = searchParams.get('integration');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace-integrations', workspaceId],
    queryFn: async () => (await api.get(`/integrations/workspaces/${workspaceId}`)).data.data as IntegrationResponse,
  });

  const disconnect = useMutation({
    mutationFn: async (provider: string) => api.delete(`/integrations/workspaces/${workspaceId}/${provider}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['workspace-integrations', workspaceId] }),
  });

  const installedByProvider = useMemo(() => new Map((data?.installed ?? []).map((item) => [item.provider, item])), [data?.installed]);
  const canManage = data?.canManage ?? (workspace?.role === 'owner' || workspace?.role === 'admin');

  const connect = async (provider: Provider) => {
    setBusyProvider(provider.slug);
    try {
      const response = await api.post(`/integrations/workspaces/${workspaceId}/${provider.slug}/authorize`);
      window.location.assign(response.data.data.authorizationUrl);
    } catch {
      setBusyProvider(null);
      await refetch();
    }
  };

  const statusMessage = result === 'connected'
    ? 'Integration connected to this Co-Space.'
    : result === 'denied'
      ? 'The provider authorization was cancelled.'
      : result === 'error'
        ? 'The provider could not be connected. Check its setup and try again.'
        : null;

  return (
    <div className="mx-auto min-h-full max-w-7xl px-4 py-8 sm:px-6 md:px-10">
      <CoSpaceContext workspaceId={workspaceId} current="integrations" />

      <header className="max-w-3xl">
        <p className="text-sm font-medium text-accent-blue">Connected tools</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-foreground">Bring the team’s tools into one place</h1>
        <p className="mt-3 text-sm leading-6 text-muted">Connect services your team already uses. Credentials stay encrypted on the server and are never shown in Co-Space.</p>
      </header>

      {statusMessage && <div role="status" className="mt-6 flex items-start gap-3 rounded-xl border border-accent-blue/30 bg-accent-blue/10 px-4 py-3 text-sm text-foreground"><Check size={17} className="mt-0.5 shrink-0 text-accent-blue" />{statusMessage}</div>}

      {!canManage && <div className="mt-6 flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-sm text-muted"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-blue" /><span>Only workspace owners and admins can connect or remove integrations. You can still use connected tools.</span></div>}

      {isLoading ? (
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[0, 1, 2, 3].map((item) => <div key={item} className="h-52 animate-pulse rounded-2xl border border-border bg-surface" />)}
        </div>
      ) : isError ? (
        <div role="alert" className="mt-8 rounded-2xl border border-dashed border-border bg-surface p-10 text-center"><PlugZap className="mx-auto text-muted" size={30} /><p className="mt-3 text-sm text-muted">Integrations are temporarily unavailable.</p><button type="button" onClick={() => void refetch()} className="mt-4 rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover">Try again</button></div>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="available-integrations">
            <div className="flex items-end justify-between gap-4"><div><h2 id="available-integrations" className="text-lg font-semibold text-foreground">Available now</h2><p className="mt-1 text-sm text-muted">These connectors are ready when their OAuth keys are configured.</p></div><span className="text-xs text-muted">{data?.catalog.length ?? 0} connectors</span></div>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              {data?.catalog.map((provider) => {
                const installed = installedByProvider.get(provider.slug);
                const isBusy = busyProvider === provider.slug || (disconnect.isPending && disconnect.variables === provider.slug);
                return (
                  <article key={provider.slug} className="flex min-h-60 flex-col rounded-2xl border border-border bg-surface p-5 transition-colors hover:border-accent-blue/40">
                    <div className="flex items-start justify-between gap-4"><div className="flex items-center gap-3 text-foreground"><ProviderIcon slug={provider.slug} /><div><h3 className="font-semibold">{provider.name}</h3><p className="mt-0.5 text-xs text-muted">{installed ? `Connected to ${installed.externalAccountName || 'an account'}` : 'Workspace connector'}</p></div></div>{installed && <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent-green"><span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />Connected</span>}</div>
                    <p className="mt-5 text-sm leading-6 text-muted">{provider.description}</p>
                    <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted" aria-label={`${provider.name} capabilities`}>{provider.capabilities.map((capability) => <li key={capability} className="flex items-center gap-1.5"><Check size={13} className="text-accent-blue" />{capability}</li>)}</ul>
                    <div className="mt-auto pt-5">
                      {installed ? (
                        canManage && <button type="button" disabled={isBusy} onClick={() => { disconnect.mutate(provider.slug); }} className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-red-500/10 hover:text-red-600 disabled:opacity-50"><Unplug size={15} />{isBusy ? 'Removing...' : 'Disconnect'}</button>
                      ) : provider.configured ? (
                        canManage && <button type="button" disabled={isBusy} onClick={() => void connect(provider)} className="inline-flex items-center gap-2 rounded-lg bg-accent-blue px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-hover disabled:opacity-50">{isBusy ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}{isBusy ? 'Opening authorization...' : 'Connect'}</button>
                      ) : (
                        <p className="text-xs leading-5 text-muted">Server setup required: {provider.requiredEnvironment.join(', ')}</p>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="mt-12 border-t border-border pt-8" aria-labelledby="planned-integrations">
            <div><h2 id="planned-integrations" className="text-lg font-semibold text-foreground">On the way</h2><p className="mt-1 text-sm text-muted">These connectors are in the catalog while their workspace actions are being prepared.</p></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data?.planned.map((provider) => <div key={provider.slug} className="rounded-xl border border-dashed border-border px-4 py-4"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-foreground">{provider.name}</h3><span className="text-[11px] text-muted">Planned</span></div><p className="mt-2 text-xs leading-5 text-muted">{provider.description}</p></div>)}</div>
          </section>
        </>
      )}
    </div>
  );
}

'use client';

import { use, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { CalendarDays, Check, ChevronRight, CircleAlert, ExternalLink, FolderOpen, GitBranch, Loader2, Mail, MessageSquare, PlugZap, RefreshCw, ShieldCheck, Unplug } from 'lucide-react';

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
  lastSyncedAt: string | null;
  updatedAt: string;
};

type IntegrationResponse = {
  canManage: boolean;
  catalog: Provider[];
  planned: Array<{ slug: string; name: string; description: string }>;
  installed: InstalledIntegration[];
};

type PreviewResponse = {
  provider: string;
  providerName: string;
  items: Array<{ id: string; title: string; detail: string; meta?: string; href?: string }>;
  emptyMessage: string;
  checkedAt: string;
};

const providerIcons = {
  gmail: Mail,
  slack: MessageSquare,
  github: GitBranch,
  'google-calendar': CalendarDays,
  'google-drive': FolderOpen,
} as const;

const providerUses: Record<string, { label: string; destination: string }> = {
  gmail: { label: 'Unread mail and conversation context', destination: 'Notes and project discussions' },
  slack: { label: 'Channels your team can reference', destination: 'Shared projects and updates' },
  github: { label: 'Repositories and engineering activity', destination: 'Project planning and delivery' },
  'google-calendar': { label: 'Upcoming events from the primary calendar', destination: 'Your planning view' },
  'google-drive': { label: 'Recent files and document metadata', destination: 'Notes and shared references' },
};

function ProviderIcon({ slug, size = 22 }: { slug: string; size?: number }) {
  const Icon = providerIcons[slug as keyof typeof providerIcons] ?? PlugZap;
  return <Icon size={size} strokeWidth={1.7} aria-hidden="true" />;
}

function formatDate(value: string | null) {
  if (!value) return 'Not checked yet';
  return `Checked ${new Date(value).toLocaleString('en', { dateStyle: 'medium', timeStyle: 'short' })}`;
}

function apiErrorMessage(error: unknown, fallback: string) {
  if (typeof error === 'object' && error && 'response' in error) {
    const response = (error as { response?: { data?: { error?: { message?: string } } } }).response;
    if (response?.data?.error?.message) return response.data.error.message;
  }
  return fallback;
}

export default function WorkspaceIntegrationsPage({ params }: { params: Promise<{ workspaceId: string }> }) {
  const { workspaceId } = use(params);
  const { workspaces } = useWorkspace();
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const workspace = workspaces.find((item) => item.id === workspaceId);
  const result = searchParams.get('integration');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['workspace-integrations', workspaceId],
    queryFn: async () => (await api.get(`/integrations/workspaces/${workspaceId}`)).data.data as IntegrationResponse,
  });

  const preview = useQuery({
    queryKey: ['workspace-integration-preview', workspaceId, selectedProvider],
    queryFn: async () => (await api.get(`/integrations/workspaces/${workspaceId}/${selectedProvider}/preview`)).data.data as PreviewResponse,
    enabled: Boolean(selectedProvider),
  });

  const disconnect = useMutation({
    mutationFn: async (provider: string) => api.delete(`/integrations/workspaces/${workspaceId}/${provider}`),
    onSuccess: (_, provider) => {
      if (selectedProvider === provider) setSelectedProvider(null);
      setActionError(null);
      void queryClient.invalidateQueries({ queryKey: ['workspace-integrations', workspaceId] });
    },
    onError: (error) => setActionError(apiErrorMessage(error, 'The connection could not be removed. Try again.')),
    onSettled: () => setBusyProvider(null),
  });

  const installedByProvider = useMemo(() => new Map((data?.installed ?? []).map((item) => [item.provider, item])), [data?.installed]);
  const canManage = data?.canManage ?? (workspace?.role === 'owner' || workspace?.role === 'admin');
  const configuredCount = data?.catalog.filter((provider) => provider.configured).length ?? 0;

  const connect = async (provider: Provider) => {
    setBusyProvider(provider.slug);
    setActionError(null);
    try {
      const response = await api.post(`/integrations/workspaces/${workspaceId}/${provider.slug}/authorize`);
      window.location.assign(response.data.data.authorizationUrl);
    } catch (error) {
      setBusyProvider(null);
      setActionError(apiErrorMessage(error, `${provider.name} is not ready to connect yet.`));
    }
  };

  const statusMessage = result === 'connected'
    ? { tone: 'success', text: 'Connection added. Check it below to see what MySpace can read.' }
    : result === 'denied'
      ? { tone: 'warning', text: 'Authorization was cancelled. Nothing was added to this Co-Space.' }
      : result === 'error'
        ? { tone: 'warning', text: 'The provider could not be connected. Check the setup and try again.' }
        : null;

  return (
    <div className="mx-auto min-h-full max-w-7xl px-4 py-8 sm:px-6 md:px-10">
      <CoSpaceContext workspaceId={workspaceId} current="integrations" />

      <header className="grid gap-8 border-b border-border pb-8 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-end">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold text-accent-blue">Integrations</p>
          <h1 className="mt-2 max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">Make the tools around your work useful here.</h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-muted">Connect a service, review the access it gives MySpace, and check its latest shared context without leaving this Co-Space.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
          <div><p className="text-2xl font-semibold tracking-tight text-foreground">{data?.installed.length ?? 0}</p><p className="mt-1 text-xs leading-5 text-muted">Connected here</p></div>
          <div><p className="text-2xl font-semibold tracking-tight text-foreground">{configuredCount}</p><p className="mt-1 text-xs leading-5 text-muted">Ready to connect</p></div>
        </div>
      </header>

      {statusMessage && <div role="status" className={`mt-6 flex items-start gap-3 border px-4 py-3 text-sm ${statusMessage.tone === 'success' ? 'border-accent-green/40 bg-accent-green/10 text-foreground' : 'border-amber-600/30 bg-amber-500/10 text-foreground'}`}>{statusMessage.tone === 'success' ? <Check size={17} className="mt-0.5 shrink-0 text-accent-green" /> : <CircleAlert size={17} className="mt-0.5 shrink-0 text-amber-700" />}<span>{statusMessage.text}</span></div>}
      {actionError && <div role="alert" className="mt-6 flex items-start gap-3 border border-red-600/30 bg-red-500/10 px-4 py-3 text-sm text-foreground"><CircleAlert size={17} className="mt-0.5 shrink-0 text-red-700" /><span>{actionError}</span></div>}
      {!canManage && <div className="mt-6 flex items-start gap-3 border border-border bg-surface px-4 py-3 text-sm text-muted"><ShieldCheck size={17} className="mt-0.5 shrink-0 text-accent-blue" /><span>Only workspace owners and admins can change connections. You can still check connected data.</span></div>}

      {data && configuredCount === 0 && <section className="mt-8 border border-border bg-surface px-5 py-5 sm:px-6" aria-labelledby="setup-required"><div className="flex items-start gap-4"><PlugZap size={21} className="mt-0.5 shrink-0 text-accent-blue" /><div><h2 id="setup-required" className="font-semibold text-foreground">Connections need one-time server setup</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted">No OAuth providers are configured in this environment yet. An administrator needs to add the provider credentials and the encryption key to the API server before anyone can connect an account.</p><p className="mt-3 text-xs font-medium text-foreground">Until then, the page remains read-only and no credentials are requested.</p></div></div></section>}

      {isLoading ? <div className="mt-8 space-y-3" aria-label="Loading integrations">{[0, 1, 2, 3].map((item) => <div key={item} className="h-24 animate-pulse border border-border bg-surface" />)}</div> : isError ? <div role="alert" className="mt-8 border border-dashed border-border bg-surface p-10 text-center"><PlugZap className="mx-auto text-muted" size={30} /><p className="mt-3 text-sm text-muted">Integrations are temporarily unavailable.</p><button type="button" onClick={() => void refetch()} className="mt-4 inline-flex items-center gap-2 border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-hover"><RefreshCw size={15} />Try again</button></div> : (
        <>
          <section className="mt-8" aria-labelledby="connected-integrations">
            <div><h2 id="connected-integrations" className="text-lg font-semibold text-foreground">Connected to this Co-Space</h2><p className="mt-1 text-sm text-muted">These accounts are shared at the workspace level. Tokens stay encrypted on the server.</p></div>
            {data?.installed.length ? <div className="mt-4 divide-y divide-border border-y border-border bg-surface">{data.installed.map((installed) => { const provider = data.catalog.find((item) => item.slug === installed.provider); const isBusy = busyProvider === installed.provider; const isSelected = selectedProvider === installed.provider; return <div key={installed.id} className="px-4 py-5 sm:px-5"><div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)_auto] lg:items-center"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 shrink-0 text-foreground"><ProviderIcon slug={installed.provider} /></span><div className="min-w-0"><h3 className="font-semibold text-foreground">{provider?.name ?? installed.provider}</h3><p className="mt-1 truncate text-sm text-muted">{installed.externalAccountName || 'Connected account'}</p><p className="mt-2 text-xs text-muted">{formatDate(installed.lastSyncedAt)}</p></div></div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">What it gives you</p><p className="mt-2 text-sm leading-5 text-foreground">{providerUses[installed.provider]?.label ?? 'Connected provider context'}</p><p className="mt-1 text-xs text-muted">Used for {providerUses[installed.provider]?.destination ?? 'workspace context'}</p></div><div className="flex flex-wrap items-center gap-2 lg:justify-end"><button type="button" onClick={() => setSelectedProvider(isSelected ? null : installed.provider)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-accent-blue transition-colors hover:bg-surface-hover">{isSelected ? 'Hide check' : 'Check connection'}<ChevronRight size={15} className={isSelected ? 'rotate-90 transition-transform' : 'transition-transform'} /></button>{canManage && <button type="button" disabled={isBusy} onClick={() => void connect(provider ?? { ...installed, name: installed.provider, description: '', capabilities: [], configured: true, requiredEnvironment: [], slug: installed.provider })} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-surface-hover hover:text-foreground disabled:opacity-50">{isBusy ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}{isBusy ? 'Opening...' : 'Reconnect'}</button>}{canManage && <button type="button" disabled={isBusy || disconnect.isPending} onClick={() => { if (window.confirm(`Disconnect ${provider?.name ?? installed.provider}?`)) { setBusyProvider(installed.provider); disconnect.mutate(installed.provider); } }} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-muted transition-colors hover:bg-red-500/10 hover:text-red-700 disabled:opacity-50"><Unplug size={15} />Disconnect</button>}</div></div>{isSelected && <PreviewPanel preview={preview.data} isLoading={preview.isLoading} isError={preview.isError} onRetry={() => void preview.refetch()} />}</div>; })}</div> : <div className="mt-4 border border-dashed border-border p-6"><p className="text-sm font-semibold text-foreground">No accounts connected yet.</p><p className="mt-1 text-sm leading-6 text-muted">Choose a service below to decide what should be available in this Co-Space.</p></div>}
          </section>

          <section className="mt-12" aria-labelledby="available-integrations"><div className="flex items-end justify-between gap-4"><div><h2 id="available-integrations" className="text-lg font-semibold text-foreground">Choose a service</h2><p className="mt-1 text-sm text-muted">Each connection is read in the narrow way shown here. You can remove it at any time.</p></div><span className="text-xs text-muted">{data?.catalog.length ?? 0} services</span></div><div className="mt-4 divide-y divide-border border-y border-border bg-surface">{data?.catalog.map((provider) => { const installed = installedByProvider.get(provider.slug); const isBusy = busyProvider === provider.slug; return <article key={provider.slug} className="grid gap-5 px-4 py-5 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(15rem,22rem)_auto] lg:items-center"><div className="flex min-w-0 items-start gap-3"><span className="mt-0.5 shrink-0 text-foreground"><ProviderIcon slug={provider.slug} /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-3 gap-y-1"><h3 className="font-semibold text-foreground">{provider.name}</h3>{installed && <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent-green"><span className="h-1.5 w-1.5 rounded-full bg-accent-green" aria-hidden="true" />Connected</span>}</div><p className="mt-1 text-sm leading-5 text-muted">{provider.description}</p><ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted" aria-label={`${provider.name} permissions`}>{provider.capabilities.map((capability) => <li key={capability} className="flex items-center gap-1.5"><Check size={13} className="text-accent-blue" />{capability}</li>)}</ul></div></div><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">In MySpace</p><p className="mt-2 text-sm leading-5 text-foreground">{providerUses[provider.slug]?.label}</p><p className="mt-1 text-xs text-muted">{providerUses[provider.slug]?.destination}</p></div><div className="flex items-center gap-3 lg:justify-end">{!canManage ? <span className="text-xs text-muted">Ask an owner to change this</span> : installed ? <button type="button" onClick={() => setSelectedProvider(provider.slug)} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-accent-blue transition-colors hover:bg-surface-hover">Check data<ChevronRight size={15} /></button> : provider.configured ? <button type="button" disabled={isBusy} onClick={() => void connect(provider)} className="inline-flex min-w-32 items-center justify-center gap-2 bg-accent-blue px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-blue-hover disabled:opacity-50">{isBusy ? <Loader2 size={15} className="animate-spin" /> : <PlugZap size={15} />}{isBusy ? 'Opening...' : `Connect ${provider.name}`}</button> : <span className="max-w-48 text-right text-xs leading-5 text-muted">Not enabled on this server</span>}</div></article>; })}</div></section>

          <section className="mt-12 border-t border-border pt-8" aria-labelledby="planned-integrations"><div><h2 id="planned-integrations" className="text-lg font-semibold text-foreground">Planned connections</h2><p className="mt-1 text-sm text-muted">Visible for direction only. These do not request access or create a dead connect button.</p></div><div className="mt-4 grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">{data?.planned.map((provider) => <div key={provider.slug}><div className="flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-border" aria-hidden="true" /><h3 className="text-sm font-semibold text-foreground">{provider.name}</h3></div><p className="mt-2 text-xs leading-5 text-muted">{provider.description}</p></div>)}</div></section>
        </>
      )}
    </div>
  );
}

function PreviewPanel({ preview, isLoading, isError, onRetry }: { preview?: PreviewResponse; isLoading: boolean; isError: boolean; onRetry: () => void }) {
  return <div className="mt-5 border-l-2 border-accent-blue bg-background px-4 py-4 sm:ml-8"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">Connection check</p><p className="mt-1 text-sm text-muted">A small live sample verifies that the account still works. Nothing is imported or changed.</p></div>{preview && <span className="shrink-0 text-xs text-muted">{new Date(preview.checkedAt).toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</span>}</div>{isLoading ? <div className="mt-4 flex items-center gap-2 text-sm text-muted"><Loader2 size={15} className="animate-spin" />Checking the connection...</div> : isError ? <div className="mt-4 flex flex-wrap items-center gap-3"><p className="text-sm text-red-700">This account could not be read. Reconnect it and try again.</p><button type="button" onClick={onRetry} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-semibold text-accent-blue hover:bg-surface-hover"><RefreshCw size={15} />Try again</button></div> : preview?.items.length ? <ul className="mt-4 divide-y divide-border border-y border-border">{preview.items.map((item) => <li key={item.id} className="flex items-start justify-between gap-4 py-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{item.title}</p><p className="mt-1 truncate text-xs text-muted">{item.detail}</p></div><div className="flex shrink-0 items-center gap-3">{item.meta && <span className="text-xs text-muted">{item.meta}</span>}{item.href && <a href={item.href} target="_blank" rel="noreferrer" aria-label={`Open ${item.title}`} className="text-accent-blue hover:text-accent-blue-hover"><ExternalLink size={15} /></a>}</div></li>)}</ul> : <p className="mt-4 text-sm text-muted">{preview?.emptyMessage ?? 'No recent data found.'}</p>}</div>;
}

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Palette, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import api from '@/lib/api';

type Canvas = { id: string; title: string; updatedAt: string };
export function CoCanvasList({ workspaceId }: { workspaceId: string }) {
  const router = useRouter(); const queryClient = useQueryClient();
  const { data: canvases = [], isLoading, isError } = useQuery({ queryKey: ['co-canvases', workspaceId], queryFn: async () => (await api.get(`/workspaces/${workspaceId}/canvases`)).data.data as Canvas[] });
  const create = useMutation({ mutationFn: async () => (await api.post(`/workspaces/${workspaceId}/canvases`, { title: 'Untitled Co-Canvas' })).data.data as Canvas, onSuccess: (canvas) => { queryClient.invalidateQueries({ queryKey: ['co-canvases', workspaceId] }); router.push(`/co-space/${workspaceId}/canvas/${canvas.id}`); } });
  return <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 md:px-10"><header className="mb-9 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-sm font-medium text-accent-blue">Shared drawing space</p><h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Co-Canvas</h1><p className="mt-3 max-w-lg text-sm text-muted">Build maps, plans, and notes together in a shared board.</p></div><button onClick={() => create.mutate()} disabled={create.isPending} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-accent-blue px-4 py-2 text-sm font-semibold text-white shadow-xs disabled:opacity-50 transition-all active:scale-95 cursor-pointer">{create.isPending ? <Loader2 className="animate-spin" size={17} /> : <Plus size={17} />}New canvas</button></header>{isLoading ? <div className="py-20 text-center text-muted"><Loader2 className="mx-auto animate-spin" /> </div> : isError ? <p className="rounded-xl bg-red-500/10 p-4 text-sm text-red-600">Could not load shared canvases.</p> : canvases.length ? <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{canvases.map((canvas) => <motion.button whileTap={{ scale: 0.99 }} key={canvas.id} onClick={() => router.push(`/co-space/${workspaceId}/canvas/${canvas.id}`)} className="min-h-44 rounded-2xl border border-border bg-surface p-5 text-left hover:bg-surface-hover cursor-pointer"><Palette size={22} className="text-accent-blue" /><h2 className="mt-10 truncate text-lg font-semibold">{canvas.title}</h2><p className="mt-2 text-xs text-muted">Updated {new Date(canvas.updatedAt).toLocaleDateString()}</p></motion.button>)}</div> : <div className="rounded-2xl border border-dashed border-border p-10 text-center"><Palette className="mx-auto text-muted" /><h2 className="mt-4 font-semibold">Start the first shared canvas</h2><p className="mt-2 text-sm text-muted">Everyone in this Co-Space can see it and contribute.</p></div>}</div>;
}

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, Check, Loader2 } from 'lucide-react';
import { io } from 'socket.io-client';

import api from '@/lib/api';

type Notification = {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
};

type NotificationResponse = { items: Notification[]; unreadCount: number };

function notificationLabel(notification: Notification) {
  const workspaceName = typeof notification.payload.workspaceName === 'string' ? notification.payload.workspaceName : 'your workspace';
  if (notification.type === 'member_joined') return `A new member joined ${workspaceName}`;
  if (notification.type === 'canvas_comment_mention') return 'You were mentioned in a canvas comment';
  if (notification.type === 'shared_card_assignment') return 'A shared card was assigned to you';
  if (notification.type === 'workspace_invite') return 'You have a workspace invitation';
  if (notification.type === 'comment_activity') return 'There is new activity on a comment';
  return 'You have a new workspace notification';
}

export function NotificationBell() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await api.get('/notifications')).data.data as NotificationResponse,
    staleTime: 15_000,
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:8000', { auth: { token } });
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
    socket.on('notification:new', refresh);
    return () => {
      socket.off('notification:new', refresh);
      socket.disconnect();
    };
  }, [queryClient]);

  const markRead = async (notification: Notification) => {
    if (!notification.readAt) {
      await api.post(`/notifications/${notification.id}/read`);
      await queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  };

  const markAllRead = async () => {
    await api.post('/notifications/read-all');
    await queryClient.invalidateQueries({ queryKey: ['notifications'] });
  };

  return (
    <div className="fixed right-4 top-3 z-50 md:right-6 md:top-5">
      <button
        type="button"
        aria-label="Notifications"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-border bg-surface text-muted transition-colors hover:bg-surface-hover hover:text-foreground"
      >
        <Bell size={17} />
        {!!data?.unreadCount && <span className="absolute -right-1 -top-1 flex min-h-4 min-w-4 items-center justify-center rounded-full bg-accent-blue px-1 text-[10px] font-semibold text-white">{data.unreadCount > 99 ? '99+' : data.unreadCount}</span>}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border bg-surface shadow-lg">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-semibold">Notifications</p>
              <p className="text-xs text-muted">{data?.unreadCount ?? 0} unread</p>
            </div>
            <button type="button" onClick={() => void markAllRead()} className="text-xs font-medium text-accent-blue hover:text-accent-blue-hover">Mark all read</button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted"><Loader2 className="animate-spin" size={16} />Loading</div>
            ) : !data?.items.length ? (
              <p className="px-4 py-8 text-center text-sm text-muted">You’re all caught up.</p>
            ) : data.items.map((notification) => {
              const href = typeof notification.payload.href === 'string' ? notification.payload.href : undefined;
              const content = (
                <div className={`flex gap-3 px-4 py-3 text-left transition-colors hover:bg-surface-hover ${notification.readAt ? 'opacity-65' : ''}`}>
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent-blue" aria-hidden="true" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm leading-5">{notificationLabel(notification)}</p>
                    <p className="mt-1 text-xs text-muted">{new Date(notification.createdAt).toLocaleString()}</p>
                  </div>
                  {notification.readAt && <Check className="mt-1 text-muted" size={15} />}
                </div>
              );
              return href ? <Link key={notification.id} href={href} onClick={() => void markRead(notification)}>{content}</Link> : <button key={notification.id} type="button" onClick={() => void markRead(notification)} className="block w-full">{content}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import { CommandPalette } from './CommandPalette';
import Sidebar from './Sidebar';

const publicRoutes = new Set(['/', '/login', '/register']);

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = publicRoutes.has(pathname);

  if (isPublicRoute) {
    return <div className="min-h-full w-full">{children}</div>;
  }

  return (
    <div className="flex h-full">
      <Sidebar />
      <main className="h-full flex-1 overflow-y-auto">{children}</main>
      <CommandPalette />
    </div>
  );
}

'use client';

import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CommandPalette } from './CommandPalette';
import Sidebar, { MobileMenuButton } from './Sidebar';
import { pageTransition } from '@/lib/motion';
import { NotificationBell } from './NotificationBell';

const publicRoutes = new Set(['/', '/login', '/register', '/forgot-password', '/reset-password']);
const isPublicPath = (path: string) => publicRoutes.has(path) || path.startsWith('/co-space/join/');

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isPublicRoute = isPublicPath(pathname);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  if (isPublicRoute) {
    return <div className="min-h-full w-full">{children}</div>;
  }

  return (
    <div className="flex h-[100dvh] min-h-[100dvh]">
      <div className="hidden md:block"><Sidebar /></div>
      <MobileMenuButton onClick={() => setIsMenuOpen(true)} />
      <NotificationBell />
      <AnimatePresence>{isMenuOpen && <><motion.button aria-label="Close navigation" onClick={() => setIsMenuOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-30 bg-foreground/20 md:hidden" /><motion.div initial={{ x: -320 }} animate={{ x: 0 }} exit={{ x: -320 }} transition={{ type: 'spring', stiffness: 300, damping: 32 }} className="fixed inset-y-0 left-0 z-40 md:hidden"><Sidebar isMobileDrawer onClose={() => setIsMenuOpen(false)} /></motion.div></>}</AnimatePresence>
      <main className="h-[100dvh] min-h-0 min-w-0 flex-1 overflow-y-auto pt-14 md:pt-0"><AnimatePresence mode="wait"><motion.div className="h-full" key={pathname} {...pageTransition}>{children}</motion.div></AnimatePresence></main>
      <CommandPalette />
    </div>
  );
}

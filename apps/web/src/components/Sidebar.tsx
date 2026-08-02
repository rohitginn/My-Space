'use client';

import { ComponentType, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft, ChevronRight, LogOut, Menu, Settings, Users, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from './AuthProvider';
import { useWorkspace } from './WorkspaceProvider';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { CanvasIcon, DashboardIcon, FocusIcon, GoalsIcon, HabitsIcon, InboxIcon, NotesIcon, ProjectsIcon, TasksIcon } from './AnimatedSidebarIcons';

const personalItems = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon }, { name: 'Inbox', href: '/inbox', icon: InboxIcon }, { name: 'Focus Room', href: '/focus', icon: FocusIcon }, { name: 'Canvas', href: '/canvas', icon: CanvasIcon }, { name: 'Projects', href: '/projects', icon: ProjectsIcon }, { name: 'Notes', href: '/notes', icon: NotesIcon }, { name: 'Tasks', href: '/tasks', icon: TasksIcon }, { name: 'Habits', href: '/habits', icon: HabitsIcon }, { name: 'Goals', href: '/goals', icon: GoalsIcon }, { name: 'Co-Spaces', href: '/co-space', icon: Users },
];
const coItems = [
  { name: 'Co-Canvas', href: (id: string) => `/co-space/${id}/canvas`, icon: CanvasIcon },
  { name: 'Co-Projects', href: (id: string) => `/co-space/${id}/projects`, icon: ProjectsIcon },
  { name: 'Co-Notes', href: (id: string) => `/co-space/${id}/notes`, icon: NotesIcon },
  { name: 'Members', href: (id: string) => `/co-space/${id}/members`, icon: Users },
  { name: 'Workspace settings', href: (id: string) => `/co-space/${id}/settings`, icon: Settings },
];

type SidebarProps = { isMobileDrawer?: boolean; onClose?: () => void };

export default function Sidebar({ isMobileDrawer = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { activeWorkspace, isPersonalMode } = useWorkspace();
  const [isCollapsed, setIsCollapsed] = useState(() => typeof window === 'undefined' ? false : localStorage.getItem('sidebar-collapsed') === 'true');
  const collapsed = isMobileDrawer ? false : isCollapsed;
  const toggle = () => { const next = !isCollapsed; setIsCollapsed(next); localStorage.setItem('sidebar-collapsed', String(next)); };
  const items = isPersonalMode ? personalItems.map((item) => ({ ...item, href: item.href })) : coItems.map((item) => ({ ...item, href: item.href(activeWorkspace!.id) }));

  return <motion.aside animate={{ width: collapsed ? 80 : 264 }} transition={{ type: 'spring', stiffness: 330, damping: 34 }} className={`flex h-[100dvh] shrink-0 flex-col justify-between border-r border-border bg-surface/90 py-5 backdrop-blur ${isMobileDrawer ? 'w-[min(84vw,320px)] !important' : ''}`} style={activeWorkspace ? { borderColor: `${activeWorkspace.accentColor}55` } : undefined}>
    <div>
      <div className="mb-5 flex items-center justify-between px-4"><Link href="/dashboard" className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-blue text-sm font-bold text-white">M</Link>{isMobileDrawer ? <button onClick={onClose} className="touch-target rounded-lg p-2 text-muted hover:bg-surface-hover"><X size={19} /></button> : <button onClick={toggle} className="touch-target hidden rounded-lg p-2 text-muted hover:bg-surface-hover lg:flex">{collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}</button>}</div>
      <WorkspaceSwitcher collapsed={collapsed} onNavigate={onClose} />
      <nav className="mt-5 space-y-1 px-3">
        <AnimatePresence mode="popLayout">{items.map((item) => <NavItem key={item.name} item={item} active={pathname === item.href || pathname.startsWith(`${item.href}/`)} collapsed={collapsed} onNavigate={onClose} />)}</AnimatePresence>
      </nav>
    </div>
    <div className="px-3">
      {isPersonalMode && <NavItem item={{ name: 'Settings', href: '/settings', icon: Settings }} active={pathname === '/settings'} collapsed={collapsed} onNavigate={onClose} />}
      <div className="mt-3 flex items-center gap-2 border-t border-border pt-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-hover text-xs font-semibold text-foreground">{user?.displayName?.slice(0, 2).toUpperCase() ?? 'ME'}</span>{!collapsed && <><span className="min-w-0 flex-1 truncate text-xs font-medium text-foreground">{user?.displayName}</span><button onClick={logout} className="touch-target rounded-lg p-2 text-muted hover:bg-surface-hover hover:text-red-500"><LogOut size={16} /></button></>}</div>
    </div>
  </motion.aside>;
}

type CustomIcon = ComponentType<{ isHovered: boolean; isActive: boolean }>;
type StandardIcon = ComponentType<{ size?: number; strokeWidth?: number }>;
function NavItem({ item, active, collapsed, onNavigate }: { item: { name: string; href: string; icon: CustomIcon | StandardIcon }; active: boolean; collapsed: boolean; onNavigate?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const Icon = item.icon;
  const isCustom = Icon !== Users && Icon !== Settings;
  const Custom = Icon as CustomIcon;
  const Standard = Icon as StandardIcon;
  return <motion.div initial={{ opacity: 1, y: 0 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 1, y: 0 }} whileTap={{ scale: 0.98 }} onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)}><Link href={item.href} onClick={onNavigate} title={collapsed ? item.name : undefined} className={`relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm transition-colors ${active ? 'bg-surface-hover text-accent-blue' : 'text-muted hover:bg-surface-hover hover:text-foreground'}`}>{isCustom ? <Custom isHovered={hovered} isActive={active} /> : <Standard size={18} strokeWidth={1.8} />}{!collapsed && <span className="truncate font-medium">{item.name}</span>}</Link></motion.div>;
}

export function MobileMenuButton({ onClick }: { onClick: () => void }) { return <button onClick={onClick} aria-label="Open navigation" className="touch-target fixed left-3 top-3 z-20 rounded-xl border border-border bg-surface p-2 text-foreground shadow-[0_4px_12px_rgb(15_23_42/0.12)] md:hidden"><Menu size={19} /></button>; }

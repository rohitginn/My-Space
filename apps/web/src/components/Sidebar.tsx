// ============================================================
// Custom Canvas Engine - Collapsible Smooth Sidebar Component
// ============================================================

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';
import {
  DashboardIcon, FocusIcon, CanvasIcon, ProjectsIcon,
  CalendarIcon, NotesIcon, TasksIcon, HabitsIcon, GoalsIcon, SettingsIcon, InboxIcon
} from './AnimatedSidebarIcons';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: DashboardIcon },
  { name: 'Inbox', href: '/inbox', icon: InboxIcon },
  { name: 'Focus Room', href: '/focus', icon: FocusIcon },
  { name: 'Canvas', href: '/canvas', icon: CanvasIcon },
  { name: 'Projects', href: '/projects', icon: ProjectsIcon },
  { name: 'Calendar', href: '/calendar', icon: CalendarIcon },
  { name: 'Notes', href: '/notes', icon: NotesIcon },
  { name: 'Tasks', href: '/tasks', icon: TasksIcon },
  { name: 'Habits', href: '/habits', icon: HabitsIcon },
  { name: 'Goals', href: '/goals', icon: GoalsIcon },
];


function NavItem({ item, isActive, isCollapsed }: { item: typeof navItems[0]; isActive: boolean; isCollapsed: boolean }) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = item.icon;

  return (
    <motion.div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileTap={{ scale: 0.95 }}
      className="w-full"
    >
      <Link
        href={item.href}
        className={`flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all relative ${
          isActive
            ? 'text-accent-blue shadow-sm'
            : 'text-muted hover:text-foreground hover:bg-surface-glass'
        }`}
        title={isCollapsed ? item.name : undefined}
      >
        {isActive && (
          <motion.div
            layoutId="activeNavIndicator"
            className="absolute inset-0 bg-surface-hover rounded-xl -z-10"
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          />
        )}
        <div className="shrink-0 flex items-center justify-center">
          <Icon isHovered={isHovered} isActive={isActive} />
        </div>
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="font-medium whitespace-nowrap overflow-hidden text-sm"
            >
              {item.name}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
}

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  // Sync state with localStorage on mount
  useEffect(() => {
    setIsMounted(true);
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem('sidebar-collapsed', String(nextState));
  };

  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null;
  }

  // Avoid hydrations mismatch by rendering static width initially
  const widthVal = !isMounted ? 256 : (isCollapsed ? 80 : 256);

  return (
    <motion.aside
      animate={{ width: widthVal }}
      transition={{ type: 'spring', stiffness: 350, damping: 32 }}
      className="h-screen border-r border-border glass flex flex-col justify-between py-6 shrink-0 relative z-10"
    >
      {/* Collapse Trigger Toggle Button */}
      <button
        onClick={toggleCollapse}
        className="absolute -right-3.5 top-8 w-7 h-7 rounded-full border border-border bg-surface hover:bg-surface-hover flex items-center justify-center text-muted hover:text-foreground shadow-md hover:scale-105 active:scale-95 transition-all z-20 cursor-pointer"
      >
        {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div>
        {/* Header / Logo */}
        <div className="px-5 mb-8 flex items-center gap-3 overflow-hidden">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-blue to-accent-green flex items-center justify-center shadow-lg shadow-accent-blue/20 shrink-0">
            <User size={18} className="text-white" />
          </div>
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.h1
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="text-sm font-bold text-foreground whitespace-nowrap tracking-wide"
              >
                My Space
              </motion.h1>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation List */}
        <nav className="flex flex-col gap-1.5 px-3.5">
          {navItems.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={pathname === item.href}
              isCollapsed={isCollapsed}
            />
          ))}
        </nav>
      </div>

      {/* User Progress & Settings Footer */}
      <div className="px-3.5">
        <AnimatePresence mode="wait">
          {user && !isCollapsed && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="mb-4 bg-surface rounded-xl p-4 border border-border shadow-inner overflow-hidden"
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">Level {user.level || 1}</span>
                <span className="text-xs text-muted font-medium">{user.xp || 0} XP</span>
              </div>
              <div className="h-2 w-full bg-surface-glass rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-blue to-accent-green transition-all duration-500 ease-out"
                  style={{ width: `${(user.xp || 0) % 100}%` }}
                />
              </div>
              <p className="text-[10px] text-muted text-center mt-2">
                {100 - ((user.xp || 0) % 100)} XP to Next Level
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Mini Level Badge */}
        <AnimatePresence mode="wait">
          {user && isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-10 h-10 mx-auto mb-4 rounded-xl bg-gradient-to-tr from-accent-blue to-accent-green flex flex-col items-center justify-center shadow-lg text-white font-bold text-xs"
              title={`Level ${user.level || 1} (${user.xp || 0} XP)`}
            >
              <span className="text-[9px] opacity-75">LVL</span>
              <span className="text-sm mt-[-2px]">{user.level || 1}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          onMouseEnter={() => setIsSettingsHovered(true)}
          onMouseLeave={() => setIsSettingsHovered(false)}
          whileTap={{ scale: 0.95 }}
          className="w-full"
        >
          <Link
            href="/settings"
            className="flex items-center gap-3.5 px-4 py-3 rounded-xl transition-all text-muted hover:text-foreground hover:bg-surface-glass"
            title={isCollapsed ? "Settings" : undefined}
          >
            <div className="shrink-0 flex items-center justify-center">
              <SettingsIcon isHovered={isSettingsHovered} isActive={false} />
            </div>
            <AnimatePresence mode="wait">
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="font-medium whitespace-nowrap overflow-hidden text-sm"
                >
                  Settings
                </motion.span>
              )}
            </AnimatePresence>
          </Link>
        </motion.div>
      </div>
    </motion.aside>
  );
}

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, StickyNote, CheckSquare, Layers, Calendar, Settings, User, Target, Activity, Palette } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '@/components/AuthProvider';

const navItems = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Focus Room', href: '/focus', icon: Target },
  { name: 'Canvas', href: '/canvas', icon: Palette },
  { name: 'Projects', href: '/projects', icon: Layers },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Notes', href: '/notes', icon: StickyNote },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Habits', href: '/habits', icon: Activity },
  { name: 'Goals', href: '/goals', icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  if (pathname === '/' || pathname === '/login' || pathname === '/register') {
    return null;
  }

  return (
    <aside className="w-64 h-screen border-r border-border glass flex flex-col justify-between py-6 shrink-0 relative z-10">
      <div>
        <div className="px-6 mb-8 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-accent-blue to-accent-green flex items-center justify-center shadow-lg">
            <User size={18} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-foreground">My Space</h1>
        </div>

        <nav className="flex flex-col gap-2 px-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 relative ${
                  isActive
                    ? 'text-accent-blue shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-surface-glass'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavIndicator"
                    className="absolute inset-0 bg-surface-hover rounded-xl -z-10"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <Icon size={20} className={isActive ? 'text-accent-blue' : ''} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4">
        {user && (
          <div className="mb-4 bg-surface rounded-xl p-4 border border-border shadow-inner">
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
          </div>
        )}
        <Link
          href="/settings"
          className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-muted hover:text-foreground hover:bg-surface-glass"
        >
          <Settings size={20} />
          <span className="font-medium">Settings</span>
        </Link>
      </div>
    </aside>
  );
}

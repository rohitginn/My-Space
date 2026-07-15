'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, StickyNote, CheckSquare, Layers, Calendar, Settings, User, Target, Activity } from 'lucide-react';

const navItems = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Projects', href: '/projects', icon: Layers },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Notes', href: '/notes', icon: StickyNote },
  { name: 'Tasks', href: '/tasks', icon: CheckSquare },
  { name: 'Habits', href: '/habits', icon: Activity },
  { name: 'Goals', href: '/goals', icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();

  if (pathname === '/login' || pathname === '/register') {
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
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                  isActive
                    ? 'bg-surface-hover text-accent-blue shadow-sm'
                    : 'text-muted hover:text-foreground hover:bg-surface-glass'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-accent-blue' : ''} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="px-4">
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

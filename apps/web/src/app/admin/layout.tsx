'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Users, Settings, ShieldAlert, ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const links = [
    { href: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { href: '/admin/users', label: 'User Management', icon: Users },
    { href: '/admin/settings', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <motion.aside
        initial={{ x: -300 }}
        animate={{ x: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="w-64 flex-shrink-0 border-r border-white/10 bg-black/20 backdrop-blur-xl flex flex-col"
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <ShieldAlert className="w-6 h-6 text-indigo-500 mr-3" />
          <h1 className="text-lg font-semibold tracking-wide">Admin Center</h1>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {links.map((link) => {
            const isActive = pathname === link.href;
            const Icon = link.icon;
            
            return (
              <Link key={link.href} href={link.href} className="block outline-none">
                <motion.div
                  whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex items-center px-4 py-3 rounded-xl transition-colors ${
                    isActive ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-5 h-5 mr-3" />
                  <span className="font-medium">{link.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="activeAdminTab"
                      className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full"
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <Link href="/dashboard" className="block outline-none">
            <motion.div
              whileHover={{ scale: 1.02, backgroundColor: 'rgba(255,255,255,0.05)' }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center justify-center px-4 py-3 rounded-xl text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              <span className="font-medium">Back to App</span>
            </motion.div>
          </Link>
        </div>
      </motion.aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto bg-gradient-to-br from-background to-background/50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="p-8 max-w-7xl mx-auto"
        >
          {children}
        </motion.div>
      </main>
    </div>
  );
}

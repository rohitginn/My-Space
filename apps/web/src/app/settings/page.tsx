'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="p-8 h-full bg-background text-foreground flex items-center justify-center">Loading settings...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-background p-8 relative overflow-hidden">
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-accent-blue/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <header className="mb-8 z-10 shrink-0">
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted mt-2">Manage your application preferences and appearance.</p>
      </header>
      
      <div className="flex-1 overflow-y-auto z-10 max-w-2xl">
        <div className="bg-surface border border-border rounded-xl p-6 shadow-sm mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4 border-b border-border pb-4">Appearance</h2>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-medium text-foreground">Theme</h3>
              <p className="text-sm text-muted">Customize the color theme of your workspace.</p>
            </div>
            
            <div className="flex bg-surface-hover p-1 rounded-lg border border-border">
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                <Sun size={16} /> Light
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'dark' ? 'bg-background text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                <Moon size={16} /> Dark
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${theme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                <Monitor size={16} /> System
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

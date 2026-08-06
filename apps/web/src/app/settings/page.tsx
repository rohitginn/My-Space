'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun, Monitor, User, Lock, Award, Shield, Check, AlertCircle } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import api from '@/lib/api';
import { motion } from 'framer-motion';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, updateUser, logout } = useAuth();
  const [mounted, setMounted] = useState(false);

  // Profile Form State
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [nextPassword, setNextPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    setMounted(true);
    if (user) {
      setDisplayName(user.displayName || '');
      // Bio might be nullable, fallback to empty string
      setBio(user.bio || '');
    }
  }, [user]);

  if (!mounted || !user) {
    return (
      <div className="p-8 h-full bg-background text-foreground flex items-center justify-center text-sm font-medium">
        Loading settings...
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileMessage('');
    setProfileError('');
    setIsSavingProfile(true);

    try {
      const { data } = await api.patch('/users/me', { displayName, bio });
      if (data.success) {
        updateUser({ displayName: data.data.displayName, bio: data.data.bio });
        setProfileMessage('Profile updated successfully!');
      }
    } catch (err: any) {
      setProfileError(err.response?.data?.error?.message || 'Failed to update profile.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');
    setPasswordError('');

    if (nextPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }

    setIsSavingPassword(true);

    try {
      const { data } = await api.patch('/auth/change-password', { currentPassword, nextPassword });
      if (data.success) {
        setPasswordMessage('Password changed successfully! Logging out shortly to renew session...');
        setCurrentPassword('');
        setNextPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          logout();
        }, 2500);
      }
    } catch (err: any) {
      setPasswordError(err.response?.data?.error?.message || 'Failed to change password.');
    } finally {
      setIsSavingPassword(false);
    }
  };

  return (
    <div className="flex min-h-full w-full flex-col bg-background p-4 relative overflow-y-auto sm:p-8 lg:h-full">
      <header className="mb-8 z-10 shrink-0">
        <h1 className="text-3xl font-extrabold text-foreground tracking-tight">Settings</h1>
        <p className="text-muted mt-1.5 text-sm">Manage your account workspace, profile preferences, and security settings.</p>
      </header>

      <div className="flex-1 max-w-2xl space-y-8 pb-12">
        {/* User Card Summary */}
        <div className="bg-surface border border-border rounded-2xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-zinc-800 border border-border/40 flex items-center justify-center text-zinc-300 font-bold text-2xl select-none shrink-0">
            {user.displayName ? user.displayName.slice(0, 2).toUpperCase() : <User size={28} />}
          </div>
          <div className="flex-1 text-center md:text-left min-w-0">
            <h2 className="text-lg font-bold text-foreground truncate">{user.displayName}</h2>
            <p className="text-xs text-muted truncate mt-0.5">{user.email}</p>
            {user.role && (
              <span className="inline-block mt-2 text-[10px] font-bold text-accent-blue bg-accent-blue/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                {user.role} Account
              </span>
            )}
          </div>
          
          {/* Progress overview */}
          <div className="border border-border/60 bg-surface/50 rounded-xl p-4 w-full md:w-auto min-w-[200px]">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-[10px] font-extrabold text-foreground uppercase tracking-wider flex items-center gap-1">
                <Award size={12} className="text-accent-green" /> Level {user.level || 1}
              </span>
              <span className="text-[10px] text-muted font-semibold">{user.xp || 0} XP</span>
            </div>
            <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-blue to-accent-green"
                style={{ width: `${(user.xp || 0) % 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Profile Settings */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
            <User size={18} className="text-muted" /> Profile Settings
          </h2>
          
          <form onSubmit={handleSaveProfile} className="space-y-4">
            {profileMessage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 border border-green-500/20 bg-green-500/5 text-green-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check size={14} /> {profileMessage}
              </motion.div>
            )}
            {profileError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 border border-red-500/20 bg-red-500/5 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} /> {profileError}
              </motion.div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-300 px-2 py-2 text-sm text-white outline-none transition-colors"
                placeholder="Name"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Bio</label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-300 px-2 py-2 text-sm text-white outline-none transition-colors resize-none h-16"
                placeholder="A bit about yourself..."
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* Security / Password Change */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
            <Lock size={18} className="text-muted" /> Password & Security
          </h2>
          
          <form onSubmit={handleSavePassword} className="space-y-4">
            {passwordMessage && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 border border-green-500/20 bg-green-500/5 text-green-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <Check size={14} /> {passwordMessage}
              </motion.div>
            )}
            {passwordError && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3.5 border border-red-500/20 bg-red-500/5 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} /> {passwordError}
              </motion.div>
            )}

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-300 px-2 py-2 text-sm text-white outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">New Password</label>
              <input
                type="password"
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-300 px-2 py-2 text-sm text-white outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider font-semibold text-zinc-500 mb-1.5">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-transparent border-b border-zinc-800 focus:border-zinc-300 px-2 py-2 text-sm text-white outline-none transition-colors"
                placeholder="••••••••"
                required
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isSavingPassword}
                className="bg-white hover:bg-zinc-200 text-black px-4 py-2 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {isSavingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* Theme Settings */}
        <div className="bg-surface border border-border rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-foreground mb-4 pb-3 border-b border-border flex items-center gap-2">
            <Shield size={18} className="text-muted" /> Display Preferences
          </h2>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Theme Settings</h3>
              <p className="text-xs text-muted mt-0.5">Customize the appearance mode of your cockpit workspace.</p>
            </div>
            
            <div className="flex bg-surface-hover p-1 rounded-xl border border-border shrink-0">
              <button 
                onClick={() => setTheme('light')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${theme === 'light' ? 'bg-background text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                <Sun size={14} /> Light
              </button>
              <button 
                onClick={() => setTheme('dark')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${theme === 'dark' ? 'bg-background text-white shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                <Moon size={14} /> Dark
              </button>
              <button 
                onClick={() => setTheme('system')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${theme === 'system' ? 'bg-background text-foreground shadow-sm' : 'text-muted hover:text-foreground'}`}
              >
                <Monitor size={14} /> System
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

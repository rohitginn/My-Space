'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize, Minimize, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useAuth } from '@/components/AuthProvider';
import { useDialog } from '@/components/DialogProvider';
import api from '@/lib/api';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

export default function FocusRoom() {
  const { user } = useAuth();
  const { alert } = useDialog();
  const queryClient = useQueryClient();
  
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(50);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Fetch active tasks to select one for focus
  const { data: tasks } = useQuery({
    queryKey: ['tasks'],
    queryFn: async () => {
      const { data } = await api.get('/todos');
      const allTodos = data.data as any[];
      return allTodos.filter(t => !t.isCompleted);
    }
  });

  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Load YouTube Player API and control the player
  useEffect(() => {
    if (!window.YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      playerRef.current = new window.YT.Player('focus-youtube-iframe', {
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            if (isActive) {
              event.target.playVideo();
            } else {
              event.target.pauseVideo();
            }
          }
        }
      });
    };

    window.onYouTubeIframeAPIReady = () => {
      initPlayer();
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    }
  }, []);

  // Update volume when slider changes
  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (playerRef.current && typeof playerRef.current.setVolume === 'function') {
      playerRef.current.setVolume(newVolume);
    }
  };

  // Sync play/pause with timer active state
  useEffect(() => {
    if (playerRef.current && typeof playerRef.current.playVideo === 'function') {
      if (isActive) {
        playerRef.current.playVideo();
      } else {
        playerRef.current.pauseVideo();
      }
    }
  }, [isActive]);

  useEffect(() => {
    let interval: any = null;
    if (isActive && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((time) => time - 1);
      }, 1000);
    } else if (isActive && timeLeft === 0) {
      handleComplete();
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isActive, timeLeft]);

  const handleComplete = async () => {
    setIsActive(false);
    confetti({
      particleCount: 150,
      spread: 80,
      origin: { y: 0.4 },
      colors: ['#3b82f6', '#10b981', '#f59e0b', '#ec4899']
    });

    if (!isBreak) {
      // Award XP for finishing a pomodoro
      await api.patch('/users/me/xp', { amount: 15 }).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      await alert('Focus session complete! You earned +15 XP.');
      setIsBreak(true);
      setTimeLeft(5 * 60); // 5 min break
    } else {
      setIsBreak(false);
      setTimeLeft(25 * 60);
    }
  };

  const toggleTimer = () => setIsActive(!isActive);
  
  const resetTimer = () => {
    setIsActive(false);
    setTimeLeft(isBreak ? 5 * 60 : 25 * 60);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(err => console.error(err));
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Format time (MM:SS)
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const selectedTask = tasks?.find(t => t.id === selectedTaskId);

  return (
    <div 
      ref={containerRef}
      className={`relative w-full transition-all duration-700 ${isFullscreen ? 'h-screen fixed inset-0 z-50 bg-background flex items-center justify-center' : 'h-full p-8 max-w-5xl mx-auto overflow-y-auto'}`}
    >
      {/* Ambient Video Background (Hidden visually, audio only) */}
      <div className="w-0 h-0 opacity-0 pointer-events-none absolute">
        <iframe
          id="focus-youtube-iframe"
          className="w-0 h-0"
          src={`https://www.youtube.com/embed/tRsQsTMvPNg?enablejsapi=1&autoplay=1&mute=0&controls=0&showinfo=0&rel=0&loop=1&playlist=tRsQsTMvPNg`}
          allow="autoplay; encrypted-media"
          frameBorder="0"
        ></iframe>
      </div>

      <div className={`relative z-10 w-full max-w-2xl mx-auto flex flex-col items-center justify-center h-full ${isFullscreen ? 'scale-125' : ''}`}>
        
        <header className="mb-12 text-center w-full">
          <h1 className="text-4xl font-bold tracking-tight text-foreground mb-2">Focus Room</h1>
          <p className="text-muted text-lg">Deep work mode. Drop in and get it done.</p>
        </header>

        {/* Task Selector */}
        <div className="w-full max-w-md mb-12 bg-surface/50 glass rounded-2xl p-4 border border-border flex flex-col items-center">
          <label className="text-xs uppercase tracking-wider font-bold text-muted mb-2">I am currently focusing on:</label>
          <select 
            value={selectedTaskId || ''} 
            onChange={(e) => setSelectedTaskId(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-foreground focus:ring-2 focus:ring-accent-blue outline-none"
          >
            <option value="">Select a task...</option>
            {tasks?.map(t => (
              <option key={t.id} value={t.id}>{t.title}</option>
            ))}
          </select>
          {selectedTask && (
            <div className="mt-4 flex items-center gap-2 text-accent-green">
              <CheckCircle size={16} />
              <span className="text-sm font-medium">Ready to conquer: {selectedTask.title}</span>
            </div>
          )}
        </div>

        {/* Timer Circle */}
        <div className="relative w-80 h-80 flex items-center justify-center mb-12">
          <svg className="absolute inset-0 w-full h-full transform -rotate-90">
            <circle cx="160" cy="160" r="150" className="stroke-surface-glass" strokeWidth="8" fill="transparent" />
            <circle 
              cx="160" cy="160" r="150" 
              className={`transition-all duration-1000 ease-linear ${isBreak ? 'stroke-accent-green' : 'stroke-accent-blue'}`} 
              strokeWidth="8" fill="transparent" 
              strokeDasharray={2 * Math.PI * 150} 
              strokeDashoffset={(2 * Math.PI * 150) * (1 - timeLeft / (isBreak ? 5 * 60 : 25 * 60))}
              strokeLinecap="round"
            />
          </svg>
          <div className="text-center">
            <div className={`text-7xl font-bold font-mono tracking-tighter ${isBreak ? 'text-accent-green' : 'text-accent-blue'}`}>
              {formatTime(timeLeft)}
            </div>
            <div className="text-muted mt-2 text-sm uppercase tracking-widest font-bold">
              {isBreak ? 'Break Time' : 'Focus Session'}
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-6 bg-surface/80 glass rounded-full px-8 py-4 border border-border shadow-2xl">
          <div 
            className="flex items-center gap-2 text-muted hover:text-foreground cursor-pointer py-2"
            onMouseEnter={() => setShowVolumeSlider(true)}
            onMouseLeave={() => setShowVolumeSlider(false)}
          >
            {volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ 
                width: showVolumeSlider ? 80 : 0, 
                opacity: showVolumeSlider ? 1 : 0 
              }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden flex items-center h-5"
            >
              <input 
                type="range"
                min="0"
                max="100"
                value={volume}
                onChange={(e) => handleVolumeChange(Number(e.target.value))}
                className="w-20 accent-accent-blue bg-surface-glass h-1 rounded-lg cursor-pointer"
                title="Adjust Volume"
              />
            </motion.div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={resetTimer} 
            className="p-3 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-all"
          >
            <RotateCcw size={24} />
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={toggleTimer} 
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white transition-all shadow-lg ${isBreak ? 'bg-accent-green shadow-accent-green/30' : 'bg-accent-blue shadow-accent-blue/30'}`}
          >
            {isActive ? <Pause size={32} /> : <Play size={32} className="ml-1" />}
          </motion.button>

          <motion.button 
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={toggleFullscreen} 
            className="p-3 text-muted hover:text-foreground hover:bg-surface-hover rounded-full transition-all"
          >
            {isFullscreen ? <Minimize size={24} /> : <Maximize size={24} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

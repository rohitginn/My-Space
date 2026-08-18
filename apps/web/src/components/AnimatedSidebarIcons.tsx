// ============================================================
// Custom Canvas Engine - Animated Sidebar Icons
// Hand-crafted interactive SVG components with micro-animations
// ============================================================

'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface IconProps {
  isHovered: boolean;
  isActive: boolean;
}

// 1. Dashboard Icon: 2x2 grid where the bottom-right block pops/rotates
export function DashboardIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <motion.rect x="14" y="3" width="7" height="7" rx="1" animate={isHovered ? { y: -1 } : { y: 0 }} />
      <motion.rect x="3" y="14" width="7" height="7" rx="1" animate={isHovered ? { x: -1 } : { x: 0 }} />
      <motion.rect
        x="14"
        y="14"
        width="7"
        height="7"
        rx="1"
        initial={{ scale: 0.8 }}
        animate={isHovered ? { scale: 1.15, rotate: 90 } : { scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 12 }}
      />
    </svg>
  );
}

// 2. Focus Room Icon: Concentric target rings pulsing outward
export function FocusIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2">
      <motion.circle
        cx="12"
        cy="12"
        r="9"
        initial={{ opacity: 1 }}
        animate={isHovered ? { scale: [1, 1.08, 1], opacity: [1, 0.7, 1] } : { scale: 1, opacity: 1 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="5"
        animate={isHovered ? { scale: [1, 0.9, 1] } : { scale: 1 }}
        transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut', delay: 0.25 }}
      />
      <motion.circle
        cx="12"
        cy="12"
        r="2"
        fill={color}
        animate={isHovered ? { scale: 1.4 } : { scale: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 10 }}
      />
    </svg>
  );
}

// 3. Canvas Icon: Palette where colored paint dots emerge sequentially
export function CanvasIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <motion.path
        d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 14.7255 3.09032 17.1962 4.85857 19C5.3411 19.4825 6 18.8 6 18C6 17 7 16 8 16C9.5 16 11 17.5 11 19C11 20.5 10 22 12 22Z"
        animate={isHovered ? { rotate: [0, -12, 8, -4, 0] } : { rotate: 0 }}
        transition={{ duration: 0.65, ease: 'easeOut' }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
      {/* Dynamic staggered paint droplets */}
      <motion.circle
        cx="7.5"
        cy="10.5"
        r="1.7"
        fill="#ff5f56"
        stroke={isHovered ? '#ff5f56' : 'transparent'}
        animate={isHovered ? { scale: 1.35, y: -1 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 10, delay: 0.04 }}
        style={{ originX: '7.5px', originY: '10.5px' }}
      />
      <motion.circle
        cx="11.5"
        cy="7.5"
        r="1.7"
        fill="#27c93f"
        stroke={isHovered ? '#27c93f' : 'transparent'}
        animate={isHovered ? { scale: 1.35, y: -1.2 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 10, delay: 0.1 }}
        style={{ originX: '11.5px', originY: '7.5px' }}
      />
      <motion.circle
        cx="16.5"
        cy="10.5"
        r="1.7"
        fill="#ffbd2e"
        stroke={isHovered ? '#ffbd2e' : 'transparent'}
        animate={isHovered ? { scale: 1.35, y: -1 } : { scale: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 10, delay: 0.16 }}
        style={{ originX: '16.5px', originY: '10.5px' }}
      />
    </svg>
  );
}

// 4. Projects Icon: Isometric cards separating vertically
export function ProjectsIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" style={{ overflow: 'visible' }}>
      <motion.path
        d="M12 2L2 7L12 12L22 7L12 2Z"
        fill={isHovered ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}
        animate={isHovered ? { y: -4.5, scale: 1.02 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 14 }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
      <motion.path
        d="M2 12L12 17L22 12"
        animate={isHovered ? { y: 0, scale: 0.98 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 14 }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
      <motion.path
        d="M2 17L12 22L22 17"
        animate={isHovered ? { y: 4.5, scale: 0.96 } : { y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 350, damping: 14 }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
    </svg>
  );
}

// 5. Calendar Icon: Sheet lift wobble and dynamic indicator
export function CalendarIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      {/* The fixed top rings */}
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      
      {/* Swinging calendar board */}
      <motion.g
        style={{ originX: '12px', originY: '4px' }}
        animate={isHovered ? { rotate: [0, 10, -8, 6, -3, 0] } : { rotate: 0 }}
        transition={{ duration: 0.75, ease: 'easeOut' }}
      >
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <motion.rect
          x="7"
          y="13"
          width="3"
          height="3"
          rx="0.5"
          fill="currentColor"
          opacity={isHovered ? 1 : 0.3}
          animate={isHovered ? { scale: 1.3, y: -0.5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 10 }}
          style={{ originX: '8.5px', originY: '14.5px' }}
        />
        <motion.rect
          x="14"
          y="13"
          width="3"
          height="3"
          rx="0.5"
          fill="currentColor"
          opacity={isHovered ? 1 : 0.3}
          animate={isHovered ? { scale: 1.3, y: -0.5 } : { scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 350, damping: 10, delay: 0.05 }}
          style={{ originX: '15.5px', originY: '14.5px' }}
        />
      </motion.g>
    </svg>
  );
}

// 6. Notes Icon: Folded corner curls slightly, lines write out
export function NotesIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"
        animate={isHovered ? { y: -0.5 } : { y: 0 }}
      />
      <motion.path
        d="M14 2v4a2 2 0 0 0 2 2h4"
        animate={isHovered ? { scale: 1.1, originX: '14px', originY: '2px' } : { scale: 1 }}
      />
      <motion.line
        x1="8"
        y1="13"
        x2="16"
        y2="13"
        initial={{ scaleX: 1 }}
        animate={isHovered ? { scaleX: [0, 1] } : { scaleX: 1 }}
        style={{ originX: 0 }}
        transition={{ duration: 0.3 }}
      />
      <motion.line
        x1="8"
        y1="17"
        x2="13"
        y2="17"
        initial={{ scaleX: 1 }}
        animate={isHovered ? { scaleX: [0, 1] } : { scaleX: 1 }}
        style={{ originX: 0 }}
        transition={{ duration: 0.3, delay: 0.08 }}
      />
    </svg>
  );
}

// 7. Tasks Icon: Checkbox with checkmark drawing on hover
export function TasksIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <motion.path
        d="M9 11l3 3L22 4"
        initial={{ pathLength: 1 }}
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
      />
    </svg>
  );
}

// 8. Habits Icon: Pulse wave drawing left-to-right
export function HabitsIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <motion.path
        d="M22 12h-4l-3 8L9 4l-3 8H2"
        initial={{ pathLength: 1 }}
        animate={isHovered ? { pathLength: [0, 1] } : { pathLength: 1 }}
        transition={{ duration: 0.5, ease: 'easeInOut' }}
      />
    </svg>
  );
}

// 9. Goals Icon: Bullseye target where a custom arrow flies in on hover
export function GoalsIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" style={{ overflow: 'visible' }}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <motion.circle
        cx="12"
        cy="12"
        r="2.5"
        animate={isHovered ? { scale: 1.3, fill: 'var(--accent-blue)' } : { scale: 1, fill: 'transparent' }}
      />
      {/* Arrow flying in */}
      <AnimatePresence>
        {isHovered && (
          <motion.path
            d="M22 2L13 11M13 11h3.5M13 11v-3.5"
            initial={{ x: 12, y: -12, opacity: 0 }}
            animate={{ x: 0, y: 0, opacity: 1 }}
            exit={{ x: 12, y: -12, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 16 }}
          />
        )}
      </AnimatePresence>
    </svg>
  );
}

// 10. Settings Icon: Gear turning smoothly
export function SettingsIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <motion.path
        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
        animate={isHovered ? { rotate: 360 } : { rotate: 0 }}
        transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
        style={{ originX: '12px', originY: '12px' }}
      />
    </svg>
  );
}

// 11. Inbox Icon: Envelope/Tray where items drop inside
export function InboxIcon({ isHovered, isActive }: IconProps) {
  const color = isActive ? 'var(--accent-blue)' : 'currentColor';
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      {/* Box / Tray outline */}
      <motion.path
        d="M22 12h-6l-2 3h-4l-2-3H2"
        animate={isHovered ? { y: [0, 1, 0] } : { y: 0 }}
        transition={{ duration: 0.4 }}
      />
      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
      {/* Incoming message envelope dropping in */}
      <motion.path
        d="M12 2l-4 4h8l-4-4z"
        fill={color}
        initial={{ y: -8, opacity: 0, scale: 0.8 }}
        animate={isHovered ? { y: 0, opacity: [0, 1, 1, 0], scale: 1 } : { y: -8, opacity: 0, scale: 0.8 }}
        transition={{ repeat: Infinity, duration: 1.2, ease: 'easeIn' }}
      />
    </svg>
  );
}

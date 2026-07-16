'use client';

import { motion } from 'framer-motion';

interface MoodIconProps {
  isHovered: boolean;
  isSelected: boolean;
  color?: string;
}

// 1. Great Mood: Laughing face where the mouth wiggles/opens and eyes bounce
export function MoodGreatIcon({ isHovered, isSelected, color = 'currentColor' }: MoodIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <circle cx="12" cy="12" r="10" />
      {/* Laughing eyes (arched) */}
      <motion.path 
        d="M8 11.5c.5-.8 1.5-.8 2 0" 
        animate={isHovered ? { y: [0, -1, 0] } : { y: 0 }}
        transition={{ duration: 0.4 }}
      />
      <motion.path 
        d="M14 11.5c.5-.8 1.5-.8 2 0" 
        animate={isHovered ? { y: [0, -1, 0] } : { y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
      />
      {/* Open laughing mouth */}
      <motion.path
        d="M8 14c1 2.5 7 2.5 8 0H8z"
        fill={isSelected || isHovered ? color : 'transparent'}
        animate={isHovered ? { scaleY: [1, 1.2, 0.9, 1] } : { scaleY: 1 }}
        style={{ originY: '14px', originX: '12px' }}
        transition={{ duration: 0.6, repeat: isHovered ? Infinity : 0, repeatDelay: 0.2 }}
      />
    </svg>
  );
}

// 2. Good Mood: Smiling face that blinks/winks one eye on hover
export function MoodGoodIcon({ isHovered, isSelected, color = 'currentColor' }: MoodIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <circle cx="12" cy="12" r="10" />
      {/* Regular left eye */}
      <circle cx="9" cy="9" r="1" fill={color} />
      {/* Right eye that winks/blinks */}
      <motion.g style={{ originX: '15px', originY: '9px' }}>
        {isHovered ? (
          <motion.path 
            d="M14 9.5a1.5 1.5 0 0 1 2 0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />
        ) : (
          <circle cx="15" cy="9" r="1" fill={color} />
        )}
      </motion.g>
      {/* Smiling mouth */}
      <motion.path
        d="M8 14c1.5 2 6.5 2 8 0"
        animate={isHovered ? { d: "M7.5 13.5c2 3 7 3 9 0" } : { d: "M8 14c1.5 2 6.5 2 8 0" }}
        transition={{ type: 'spring', stiffness: 300, damping: 10 }}
      />
    </svg>
  );
}

// 3. Okay Mood: Straight mouth face where the mouth waves on hover
export function MoodOkayIcon({ isHovered, isSelected, color = 'currentColor' }: MoodIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <circle cx="12" cy="12" r="10" />
      {/* Flat eyes */}
      <motion.line 
        x1="8" y1="9" x2="10" y2="9" 
        animate={isHovered ? { y: [-0.5, 0.5, -0.5] } : { y: 0 }}
        transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
      />
      <motion.line 
        x1="14" y1="9" x2="16" y2="9" 
        animate={isHovered ? { y: [0.5, -0.5, 0.5] } : { y: 0 }}
        transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
      />
      {/* Straight mouth that waves */}
      <motion.path
        d="M8 15h8"
        animate={isHovered ? { d: ["M8 15h8", "M8 14.5c2 1 4-1 6 0s2 1 2 0", "M8 15.5c2-1 4 1 6 0s2-1 2 0", "M8 15h8"] } : { d: "M8 15h8" }}
        transition={{ duration: 0.8, repeat: isHovered ? Infinity : 0, ease: 'linear' }}
      />
    </svg>
  );
}

// 4. Low Mood: Sad face where the mouth curves down and eyes droop
export function MoodLowIcon({ isHovered, isSelected, color = 'currentColor' }: MoodIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      <circle cx="12" cy="12" r="10" />
      {/* Drooping/sad eyes */}
      <motion.path 
        d="M8.5 9.5L10 9" 
        animate={isHovered ? { y: 0.5, rotate: 5 } : { y: 0, rotate: 0 }}
      />
      <motion.path 
        d="M15.5 9.5L14 9" 
        animate={isHovered ? { y: 0.5, rotate: -5 } : { y: 0, rotate: 0 }}
      />
      {/* Frowning mouth */}
      <motion.path
        d="M16 16c-1.5-2-6.5-2-8 0"
        animate={isHovered ? { d: "M16.5 17c-2.5-3-6.5-3-9 0" } : { d: "M16 16c-1.5-2-6.5-2-8 0" }}
        transition={{ type: 'spring', stiffness: 200, damping: 10 }}
      />
    </svg>
  );
}

// 5. Rough Mood: Cloud wiggling and custom rain droplets dropping down
export function MoodRoughIcon({ isHovered, isSelected, color = 'currentColor' }: MoodIconProps) {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ overflow: 'visible' }}>
      {/* Cloud outline */}
      <motion.path
        d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.48 0-.94.08-1.38.22A5.5 5.5 0 0 0 5 13a4.5 4.5 0 0 0 4 5.5h8.5z"
        animate={isHovered ? { rotate: [-2, 2, -2, 0], y: [-0.5, 0.5, -0.5, 0] } : { rotate: 0, y: 0 }}
        transition={{ duration: 0.5, repeat: isHovered ? Infinity : 0 }}
        style={{ originX: 0.5, originY: 0.5 }}
      />
      {/* Animated falling rain droplets */}
      <motion.line
        x1="8" y1="17" x2="8" y2="20"
        animate={isHovered ? { y: [0, 4, 0], opacity: [0, 1, 0] } : { y: 0, opacity: 0.2 }}
        transition={{ repeat: Infinity, duration: 0.6, ease: 'linear' }}
      />
      <motion.line
        x1="12" y1="17" x2="12" y2="20"
        animate={isHovered ? { y: [0, 4, 0], opacity: [0, 1, 0] } : { y: 0, opacity: 0.2 }}
        transition={{ repeat: Infinity, duration: 0.6, ease: 'linear', delay: 0.2 }}
      />
      <motion.line
        x1="16" y1="17" x2="16" y2="20"
        animate={isHovered ? { y: [0, 4, 0], opacity: [0, 1, 0] } : { y: 0, opacity: 0.2 }}
        transition={{ repeat: Infinity, duration: 0.6, ease: 'linear', delay: 0.4 }}
      />
    </svg>
  );
}

// ============================================================
// Custom Canvas Engine - Enhanced Floating Toolbar
// ============================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, Hand, Pencil, Square, Circle, Minus,
  ArrowUpRight, Type, Undo2, Redo2, Trash2,
  ArrowUpToLine, ArrowDownToLine,
} from 'lucide-react';
import type { ToolType, ToolStyle, StrokeStyleType, FillStyleType } from './types';

interface CanvasToolbarProps {
  activeTool: ToolType;
  toolStyle: ToolStyle;
  onToolChange: (tool: ToolType) => void;
  onStyleChange: (style: Partial<ToolStyle>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  onBringToFront: () => void;
  onSendToBack: () => void;
  hasSelection: boolean;
}

const TOOLS: { type: ToolType; icon: React.ElementType; label: string; shortcut: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { type: 'pan', icon: Hand, label: 'Pan', shortcut: 'H' },
  { type: 'pen', icon: Pencil, label: 'Pen', shortcut: 'P' },
  { type: 'rectangle', icon: Square, label: 'Rectangle', shortcut: 'R' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse', shortcut: 'O' },
  { type: 'line', icon: Minus, label: 'Line', shortcut: 'L' },
  { type: 'arrow', icon: ArrowUpRight, label: 'Arrow', shortcut: 'A' },
  { type: 'text', icon: Type, label: 'Text', shortcut: 'T' },
];

const COLORS = [
  '#0ea5e9', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#64748b', '#ffffff',
  '#000000',
];

const STROKE_WIDTHS = [1, 2, 3, 5, 8];
const FONT_SIZES = [12, 14, 16, 20, 24, 32, 48];

const STROKE_STYLES: { value: StrokeStyleType; label: string; dash: string }[] = [
  { value: 'solid', label: 'Solid', dash: '' },
  { value: 'dashed', label: 'Dashed', dash: '8 4' },
  { value: 'dotted', label: 'Dotted', dash: '2 4' },
];

const FILL_STYLES: { value: FillStyleType; label: string }[] = [
  { value: 'none', label: 'None' },
  { value: 'hachure', label: 'Hachure' },
  { value: 'solid', label: 'Solid' },
  { value: 'cross-hatch', label: 'Cross Hatch' },
];

export function CanvasToolbar({
  activeTool,
  toolStyle,
  onToolChange,
  onStyleChange,
  onUndo,
  onRedo,
  onDelete,
  onBringToFront,
  onSendToBack,
  hasSelection,
}: CanvasToolbarProps) {
  const [showStylePanel, setShowStylePanel] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Click outside to close style panel
  useEffect(() => {
    if (!showStylePanel) return;

    const handleOutsideClick = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowStylePanel(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showStylePanel]);

  return (
    <div
      ref={toolbarRef}
      className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex flex-col-reverse items-center gap-3 pointer-events-none"
    >
      {/* Main floating tool bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="flex items-center gap-1 bg-surface/90 backdrop-blur-xl border border-border/60 rounded-2xl px-2 py-1.5 shadow-2xl pointer-events-auto"
      >
        {/* Drawing tools */}
        {TOOLS.map(({ type, icon: Icon, label, shortcut }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onToolChange(type)}
            title={`${label} (${shortcut})`}
            className={`relative p-2.5 rounded-xl transition-colors ${
              activeTool === type
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/30'
                : 'text-muted hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            <Icon size={18} />
          </motion.button>
        ))}

        {/* Divider */}
        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* Style panel toggle */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setShowStylePanel(!showStylePanel)}
          title="Style Options"
          className={`p-2.5 rounded-xl transition-colors ${
            showStylePanel
              ? 'bg-accent-blue/10 text-accent-blue'
              : 'text-muted hover:text-foreground hover:bg-surface-hover'
          }`}
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-current"
            style={{ backgroundColor: toolStyle.color }}
          />
        </motion.button>

        {/* Divider */}
        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* Undo / Redo */}
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} onClick={onUndo} title="Undo (⌘Z)"
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
          <Undo2 size={18} />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} onClick={onRedo} title="Redo (⌘⇧Z)"
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
          <Redo2 size={18} />
        </motion.button>

        {/* Selection Actions */}
        <AnimatePresence>
          {hasSelection && (
            <>
              <div className="w-px h-6 bg-border/60 mx-1" />

              {/* Layering */}
              <motion.button
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                onClick={onBringToFront} title="Bring to Front"
                className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                <ArrowUpToLine size={18} />
              </motion.button>
              <motion.button
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                onClick={onSendToBack} title="Send to Back"
                className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors">
                <ArrowDownToLine size={18} />
              </motion.button>

              {/* Delete */}
              <motion.button
                initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
                onClick={onDelete} title="Delete (Del)"
                className="p-2.5 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors">
                <Trash2 size={18} />
              </motion.button>
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Style panel — above toolbar */}
      <AnimatePresence>
        {showStylePanel && (
          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="w-[320px] max-h-[70vh] overflow-y-auto bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl pointer-events-auto"
          >
            {/* Color picker */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Color</p>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((color) => (
                  <motion.button
                    key={color}
                    whileHover={{ scale: 1.2 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onStyleChange({ color })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${
                      toolStyle.color === color
                        ? 'border-accent-blue scale-110 shadow-md'
                        : 'border-border/40 hover:border-border'
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>

            {/* Stroke width */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Stroke Width</p>
              <div className="flex gap-2">
                {STROKE_WIDTHS.map((w) => (
                  <motion.button
                    key={w}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onStyleChange({ strokeWidth: w })}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                      toolStyle.strokeWidth === w
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border/40 text-muted hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-xs font-semibold">{w}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Stroke style (solid / dashed / dotted) */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Stroke Style</p>
              <div className="flex gap-2">
                {STROKE_STYLES.map(({ value, label, dash }) => (
                  <motion.button
                    key={value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => onStyleChange({ strokeStyle: value })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium border transition-all ${
                      toolStyle.strokeStyle === value
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border/40 text-muted hover:text-foreground'
                    }`}
                  >
                    <svg width={24} height={2}>
                      <line
                        x1={0} y1={1} x2={24} y2={1}
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeDasharray={dash || undefined}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span>{label}</span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Fill style */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Fill Style</p>
              <div className="flex flex-wrap gap-2">
                {FILL_STYLES.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      onStyleChange({
                        fillStyle: value,
                        fill: value !== 'none' ? toolStyle.color + '30' : 'transparent',
                      });
                    }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                      toolStyle.fillStyle === value
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border/40 text-muted hover:text-foreground'
                    }`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Corner radius (for rectangles) */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Corners</p>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStyleChange({ borderRadius: 0 })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    toolStyle.borderRadius === 0
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border/40 text-muted hover:text-foreground'
                  }`}
                >
                  <svg width={14} height={14}><rect x={1} y={1} width={12} height={12} fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>
                  Sharp
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStyleChange({ borderRadius: 8 })}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    toolStyle.borderRadius === 8
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border/40 text-muted hover:text-foreground'
                  }`}
                >
                  <svg width={14} height={14}><rect x={1} y={1} width={12} height={12} rx={3} fill="none" stroke="currentColor" strokeWidth={1.5} /></svg>
                  Rounded
                </motion.button>
              </div>
            </div>

            {/* Font size */}
            <div>
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Font Size</p>
              <div className="flex flex-wrap gap-2">
                {FONT_SIZES.map((sz) => (
                  <motion.button
                    key={sz}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => onStyleChange({ fontSize: sz })}
                    className={`flex items-center justify-center w-9 h-9 rounded-lg border transition-all ${
                      toolStyle.fontSize === sz
                        ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                        : 'border-border/40 text-muted hover:text-foreground hover:bg-surface-hover'
                    }`}
                  >
                    <span className="text-xs font-semibold">{sz}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

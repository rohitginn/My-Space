// ============================================================
// Custom Canvas Engine - Floating Toolbar Component
// ============================================================

'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, Hand, Pencil, Square, Circle, Minus,
  ArrowUpRight, Type, Undo2, Redo2, Trash2, ChevronUp,
} from 'lucide-react';
import type { ToolType, ToolStyle } from './types';

interface CanvasToolbarProps {
  activeTool: ToolType;
  toolStyle: ToolStyle;
  onToolChange: (tool: ToolType) => void;
  onStyleChange: (style: Partial<ToolStyle>) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: () => void;
  hasSelection: boolean;
}

const TOOLS: { type: ToolType; icon: React.ElementType; label: string }[] = [
  { type: 'select', icon: MousePointer2, label: 'Select' },
  { type: 'pan', icon: Hand, label: 'Pan' },
  { type: 'pen', icon: Pencil, label: 'Pen' },
  { type: 'rectangle', icon: Square, label: 'Rectangle' },
  { type: 'ellipse', icon: Circle, label: 'Ellipse' },
  { type: 'line', icon: Minus, label: 'Line' },
  { type: 'arrow', icon: ArrowUpRight, label: 'Arrow' },
  { type: 'text', icon: Type, label: 'Text' },
];

const COLORS = [
  '#0ea5e9', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#64748b', '#ffffff',
  '#000000',
];

const STROKE_WIDTHS = [1, 2, 3, 5, 8];

export function CanvasToolbar({
  activeTool,
  toolStyle,
  onToolChange,
  onStyleChange,
  onUndo,
  onRedo,
  onDelete,
  hasSelection,
}: CanvasToolbarProps) {
  const [showStylePanel, setShowStylePanel] = useState(false);

  return (
    <>
      {/* Main floating tool bar — bottom center */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-surface/90 backdrop-blur-xl border border-border/60 rounded-2xl px-2 py-1.5 shadow-2xl"
      >
        {/* Drawing tools */}
        {TOOLS.map(({ type, icon: Icon, label }) => (
          <motion.button
            key={type}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onToolChange(type)}
            title={label}
            className={`relative p-2.5 rounded-xl transition-colors ${
              activeTool === type
                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/30'
                : 'text-muted hover:text-foreground hover:bg-surface-hover'
            }`}
          >
            <Icon size={18} />
            {activeTool === type && (
              <motion.div
                layoutId="toolbar-active"
                className="absolute inset-0 bg-accent-blue rounded-xl -z-10"
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              />
            )}
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
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <div
            className="w-4 h-4 rounded-full border-2 border-current"
            style={{ backgroundColor: toolStyle.color }}
          />
        </motion.button>

        {/* Divider */}
        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* Undo / Redo */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onUndo}
          title="Undo (Ctrl+Z)"
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <Undo2 size={18} />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.92 }}
          onClick={onRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover transition-colors"
        >
          <Redo2 size={18} />
        </motion.button>

        {/* Delete */}
        {hasSelection && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={onDelete}
            title="Delete (Del)"
            className="p-2.5 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 size={18} />
          </motion.button>
        )}
      </motion.div>

      {/* Style panel — pops up above the toolbar */}
      <AnimatePresence>
        {showStylePanel && (
          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="absolute bottom-24 left-1/2 -translate-x-1/2 z-30 bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl min-w-[260px]"
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
            <div className="mb-3">
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

            {/* Fill toggle */}
            <div>
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Fill</p>
              <div className="flex gap-2">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStyleChange({ fill: 'transparent' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    toolStyle.fill === 'transparent'
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border/40 text-muted hover:text-foreground'
                  }`}
                >
                  None
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => onStyleChange({ fill: toolStyle.color + '20' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    toolStyle.fill !== 'transparent'
                      ? 'border-accent-blue bg-accent-blue/10 text-accent-blue'
                      : 'border-border/40 text-muted hover:text-foreground'
                  }`}
                >
                  Filled
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================
// Custom Canvas Engine - Enhanced Floating Toolbar
// ============================================================

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MousePointer2, Hand, Pencil, Minus,
  ArrowUpRight, Type, Undo2, Redo2, Trash2,
  ArrowUpToLine, ArrowDownToLine, Shapes, ChevronDown
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

const COLORS = [
  '#0ea5e9', '#ef4444', '#22c55e', '#f59e0b', '#a855f7',
  '#ec4899', '#06b6d4', '#f97316', '#64748b', '#ffffff',
  '#000000',
];

const SHAPES = [
  { type: 'rectangle', label: 'Rectangle', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><rect x="3" y="6" width="18" height="12" rx="1.5"/></svg> },
  { type: 'ellipse', label: 'Circle', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><circle cx="12" cy="12" r="8"/></svg> },
  { type: 'diamond', label: 'Diamond', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M12 3 L21 12 L12 21 L3 12 Z"/></svg> },
  { type: 'triangle', label: 'Triangle', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><polygon points="12,3 21,20 3,20"/></svg> },
  { type: 'star', label: 'Star', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><polygon points="12,2 15,9 22,9 17,14 19,21 12,17 5,21 7,14 2,9 9,9"/></svg> },
  { type: 'hexagon', label: 'Hexagon', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><polygon points="12,3 20,7.5 20,16.5 12,21 4,16.5 4,7.5"/></svg> },
  { type: 'parallelogram', label: 'Parallelogram', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><polygon points="7,6 21,6 17,18 3,18"/></svg> },
  { type: 'trapezoid', label: 'Trapezoid', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><polygon points="6,6 18,6 21,18 3,18"/></svg> },
  { type: 'cylinder', label: 'Cylinder', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><ellipse cx="12" cy="6" rx="6" ry="2.5"/><path d="M6 6 V18 A 6 2.5 0 0 0 18 18 V6"/></svg> },
  { type: 'callout', label: 'Speech Bubble', icon: (props: any) => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" {...props}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
];

const STROKE_WIDTH_PRESETS = [
  { value: 1, label: 'S' },
  { value: 3, label: 'M' },
  { value: 5, label: 'L' },
  { value: 8, label: 'XL' }
];

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
  const [showShapePicker, setShowShapePicker] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  // Click outside to close menus
  useEffect(() => {
    if (!showStylePanel && !showShapePicker) return;

    const handleOutsideClick = (e: PointerEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setShowStylePanel(false);
        setShowShapePicker(false);
      }
    };

    document.addEventListener('pointerdown', handleOutsideClick);
    return () => document.removeEventListener('pointerdown', handleOutsideClick);
  }, [showStylePanel, showShapePicker]);

  const activeShape = SHAPES.find(s => s.type === activeTool);

  const handleShapeSelect = (type: ToolType) => {
    onToolChange(type);
    setShowShapePicker(false);
  };

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
        {/* Core Tools */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => onToolChange('select')}
          title="Select (V)"
          className={`p-2.5 rounded-xl transition-colors ${activeTool === 'select' ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <MousePointer2 size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => onToolChange('pan')}
          title="Pan (H)"
          className={`p-2.5 rounded-xl transition-colors ${activeTool === 'pan' ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <Hand size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => onToolChange('pen')}
          title="Pen (P)"
          className={`p-2.5 rounded-xl transition-colors ${activeTool === 'pen' ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <Pencil size={18} />
        </motion.button>

        {/* Shape Library Trigger */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
            onClick={() => {
              setShowShapePicker(!showShapePicker);
              setShowStylePanel(false);
            }}
            title="Shape Library"
            className={`p-2.5 rounded-xl transition-colors flex items-center gap-1 ${activeShape ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
          >
            {activeShape ? <activeShape.icon className="w-[18px] h-[18px]" /> : <Shapes size={18} />}
            <ChevronDown size={12} className="opacity-60" />
          </motion.button>

          {/* Shape Library Grid Popover */}
          <AnimatePresence>
            {showShapePicker && (
              <motion.div
                initial={{ y: -10, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: -10, opacity: 0, scale: 0.95 }}
                className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl p-3 shadow-2xl grid grid-cols-4 gap-2 w-[220px]"
              >
                {SHAPES.map((shape) => (
                  <button
                    key={shape.type}
                    onClick={() => handleShapeSelect(shape.type as ToolType)}
                    title={shape.label}
                    className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${activeTool === shape.type ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border/40 text-muted hover:text-foreground hover:bg-surface-hover'}`}
                  >
                    <shape.icon className="w-5 h-5" />
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => onToolChange('line')}
          title="Line (L)"
          className={`p-2.5 rounded-xl transition-colors ${activeTool === 'line' ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <Minus size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => onToolChange('arrow')}
          title="Arrow (A)"
          className={`p-2.5 rounded-xl transition-colors ${activeTool === 'arrow' ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <ArrowUpRight size={18} />
        </motion.button>

        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => onToolChange('text')}
          title="Text (T)"
          className={`p-2.5 rounded-xl transition-colors ${activeTool === 'text' ? 'bg-accent-blue text-white shadow-lg' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <Type size={18} />
        </motion.button>

        <div className="w-px h-6 bg-border/60 mx-1" />

        {/* Style selector */}
        <motion.button
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => {
            setShowStylePanel(!showStylePanel);
            setShowShapePicker(false);
          }}
          title="Formatting & Style"
          className={`p-2.5 rounded-xl transition-colors ${showStylePanel ? 'bg-accent-blue/10 text-accent-blue' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
        >
          <div className="w-4 h-4 rounded-full border-2 border-current" style={{ backgroundColor: toolStyle.color }} />
        </motion.button>

        <div className="w-px h-6 bg-border/60 mx-1" />

        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} onClick={onUndo} title="Undo (⌘Z)" className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover">
          <Undo2 size={18} />
        </motion.button>
        <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }} onClick={onRedo} title="Redo (⌘⇧Z)" className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover">
          <Redo2 size={18} />
        </motion.button>

        {/* Selection actions */}
        <AnimatePresence>
          {hasSelection && (
            <>
              <div className="w-px h-6 bg-border/60 mx-1" />
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileHover={{ scale: 1.1 }} onClick={onBringToFront} title="Bring to Front" className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover"><ArrowUpToLine size={18} /></motion.button>
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileHover={{ scale: 1.1 }} onClick={onSendToBack} title="Send to Back" className="p-2.5 rounded-xl text-muted hover:text-foreground hover:bg-surface-hover"><ArrowDownToLine size={18} /></motion.button>
              <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} whileHover={{ scale: 1.1 }} onClick={onDelete} title="Delete" className="p-2.5 rounded-xl text-red-400 hover:text-red-500 hover:bg-red-500/10"><Trash2 size={18} /></motion.button>
            </>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Style Panel Popover */}
      <AnimatePresence>
        {showStylePanel && (
          <motion.div
            initial={{ y: 10, opacity: 0, scale: 0.95 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 10, opacity: 0, scale: 0.95 }}
            className="w-[320px] max-h-[70vh] overflow-y-auto bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl pointer-events-auto"
          >
            {/* Color Grid */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Color & Borders</p>
              <div className="flex flex-wrap gap-2 items-center">
                {COLORS.map((color) => (
                  <motion.button
                    key={color}
                    onClick={() => onStyleChange({ color })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${toolStyle.color === color ? 'border-accent-blue scale-110 shadow-md' : 'border-border/40 hover:border-border'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
                {/* Custom Color Input */}
                <input
                  type="color"
                  value={toolStyle.color}
                  onChange={(e) => onStyleChange({ color: e.target.value })}
                  className="w-7 h-7 rounded-full bg-transparent border-0 cursor-pointer overflow-hidden outline-none p-0"
                />
              </div>
            </div>

            {/* Border presets (S, M, L, XL) */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Border Thickness</p>
              <div className="flex gap-2">
                {STROKE_WIDTH_PRESETS.map((preset) => (
                  <motion.button
                    key={preset.value}
                    onClick={() => onStyleChange({ strokeWidth: preset.value })}
                    className={`flex-1 py-1.5 rounded-lg border text-xs font-bold transition-all ${toolStyle.strokeWidth === preset.value ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border/40 text-muted hover:text-foreground hover:bg-surface-hover'}`}
                  >
                    {preset.label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Stroke Line type */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Stroke Style</p>
              <div className="flex gap-2">
                {STROKE_STYLES.map(({ value, label, dash }) => (
                  <motion.button
                    key={value}
                    onClick={() => onStyleChange({ strokeStyle: value })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border flex items-center justify-center gap-1.5 ${toolStyle.strokeStyle === value ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border/40 text-muted hover:text-foreground hover:bg-surface-hover'}`}
                  >
                    <svg width={20} height={2} className="opacity-80">
                      <line x1={0} y1={1} x2={20} y2={1} stroke="currentColor" strokeWidth={2} strokeDasharray={dash || undefined} />
                    </svg>
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Fill Style */}
            <div className="mb-4">
              <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Fill Pattern</p>
              <div className="flex flex-wrap gap-2">
                {FILL_STYLES.map(({ value, label }) => (
                  <motion.button
                    key={value}
                    onClick={() => {
                      onStyleChange({
                        fillStyle: value,
                        fill: value !== 'none' ? toolStyle.color + '30' : 'transparent',
                      });
                    }}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-all ${toolStyle.fillStyle === value ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border/40 text-muted hover:text-foreground hover:bg-surface-hover'}`}
                  >
                    {label}
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Arrow Specific Options */}
            {activeTool === 'arrow' && (
              <div className="border-t border-border/40 pt-4 mt-4 space-y-4">
                <div>
                  <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Arrow Direction</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(['none', 'start', 'end', 'both'] as const).map((head) => (
                      <button
                        key={head}
                        onClick={() => onStyleChange({ arrowHead: head } as any)}
                        className={`py-1.5 rounded-lg text-xs font-bold border capitalize transition-all ${(toolStyle as any).arrowHead === head ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border/40 text-muted hover:bg-surface-hover'}`}
                      >
                        {head}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted font-medium mb-2 uppercase tracking-wider">Arrow Routing</p>
                  <div className="grid grid-cols-3 gap-2">
                    {(['straight', 'curved', 'elbow'] as const).map((style) => (
                      <button
                        key={style}
                        onClick={() => onStyleChange({ arrowStyle: style } as any)}
                        className={`py-1.5 rounded-lg text-xs font-bold border capitalize transition-all ${(toolStyle as any).arrowStyle === style ? 'border-accent-blue bg-accent-blue/10 text-accent-blue' : 'border-border/40 text-muted hover:bg-surface-hover'}`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

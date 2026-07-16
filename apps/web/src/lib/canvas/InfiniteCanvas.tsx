// ============================================================
// Custom Canvas Engine - InfiniteCanvas SVG Viewport
// ============================================================

'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import type {
  Point, CanvasShape, PenShape, RectangleShape,
  EllipseShape, LineShape, ArrowShape, TextShape,
  HandlePosition, ToolType,
} from './types';
import {
  screenToWorld, worldToScreen, getCameraTransform, zoomAtPoint,
  isPointInRotatedShape, simplifyPath, pointsToSmoothPath,
  pointsToRawPath, generateId, getShapeBounds,
} from './math';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { CanvasToolbar } from './CanvasToolbar';
import type { CanvasEngine } from './useCanvasEngine';

interface InfiniteCanvasProps {
  engine: CanvasEngine;
  onChanged?: () => void;
}

export function InfiniteCanvas({ engine, onChanged }: InfiniteCanvasProps) {
  const { state, ...actions } = engine;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs for transient interaction state (avoids re-renders during drag)
  const drawingPointsRef = useRef<Point[]>([]);
  const dragStartRef = useRef<Point | null>(null);
  const panStartRef = useRef<{ camX: number; camY: number; mouseX: number; mouseY: number } | null>(null);
  const resizeStartRef = useRef<{
    handle: HandlePosition;
    startMouse: Point;
    originalShapes: Record<string, CanvasShape>;
  } | null>(null);
  const activeShapeIdRef = useRef<string | null>(null);

  // For text editing overlay
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textInputValue, setTextInputValue] = useState('');
  const textInputRef = useRef<HTMLTextAreaElement>(null);

  // ── Helper: get container rect ─────────────────────────────
  const getRect = useCallback(() => {
    return containerRef.current?.getBoundingClientRect() ?? new DOMRect();
  }, []);

  // ── Helper: get world point from pointer event ─────────────
  const getWorldPoint = useCallback(
    (e: React.PointerEvent | PointerEvent) => {
      return screenToWorld(e.clientX, e.clientY, state.camera, getRect());
    },
    [state.camera, getRect]
  );

  // ── Fullscreen toggle ──────────────────────────────────────
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  }, []);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // ── Shape creation helpers ─────────────────────────────────
  const createShape = useCallback(
    (type: CanvasShape['type'], worldPt: Point): CanvasShape => {
      const base = {
        id: generateId(),
        x: worldPt.x,
        y: worldPt.y,
        width: 0,
        height: 0,
        rotation: 0,
        color: state.toolStyle.color,
        strokeWidth: state.toolStyle.strokeWidth,
        strokeStyle: state.toolStyle.strokeStyle,
        fill: state.toolStyle.fill,
        fillStyle: state.toolStyle.fillStyle,
        opacity: state.toolStyle.opacity,
        zIndex: Object.keys(state.shapes).length,
      };

      switch (type) {
        case 'pen':
          return { ...base, type: 'pen', points: [worldPt], pathData: `M ${worldPt.x} ${worldPt.y}` } as PenShape;
        case 'rectangle':
          return { ...base, type: 'rectangle', borderRadius: state.toolStyle.borderRadius } as RectangleShape;
        case 'ellipse':
          return { ...base, type: 'ellipse' } as EllipseShape;
        case 'line':
          return { ...base, type: 'line' } as LineShape;
        case 'arrow':
          return { ...base, type: 'arrow' } as ArrowShape;
        case 'text':
          return {
            ...base,
            type: 'text',
            text: '',
            fontSize: state.toolStyle.fontSize,
            fontFamily: 'Inter, system-ui, sans-serif',
            width: 200,
            height: 30,
          } as TextShape;
        default:
          return { ...base, type: 'rectangle', borderRadius: state.toolStyle.borderRadius } as RectangleShape;
      }
    },
    [state.toolStyle, state.shapes]
  );

  // ── Wheel: Zoom ────────────────────────────────────────────
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const newCam = zoomAtPoint(state.camera, e.clientX, e.clientY, getRect(), e.deltaY);
      actions.setCamera(newCam);
    },
    [state.camera, getRect, actions]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  // ── Keyboard shortcuts ─────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length > 0 && !editingTextId) {
        engine.pushHistory();
        actions.deleteShapes(state.selectedIds);
        onChanged?.();
        return;
      }

      // Undo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
        onChanged?.();
        return;
      }

      // Redo
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        actions.redo();
        onChanged?.();
        return;
      }

      // Escape: deselect
      if (e.key === 'Escape') {
        actions.setSelected([]);
        actions.setTool('select');
        setEditingTextId(null);
        return;
      }

      // Tool shortcuts
      const toolShortcuts: Record<string, ToolType> = {
        v: 'select',
        h: 'pan',
        p: 'pen',
        r: 'rectangle',
        o: 'ellipse',
        l: 'line',
        a: 'arrow',
        t: 'text',
      };
      if (!e.metaKey && !e.ctrlKey && !e.altKey && toolShortcuts[e.key] && !editingTextId) {
        actions.setTool(toolShortcuts[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.selectedIds, editingTextId, engine, actions, onChanged]);

  // ── Pointer Down ───────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left-click

      const worldPt = getWorldPoint(e);
      const tool = state.activeTool;

      // Pan tool
      if (tool === 'pan') {
        actions.setPanning(true);
        panStartRef.current = {
          camX: state.camera.x,
          camY: state.camera.y,
          mouseX: e.clientX,
          mouseY: e.clientY,
        };
        (e.target as Element)?.setPointerCapture?.(e.pointerId);
        return;
      }

      // Text tool
      if (tool === 'text') {
        engine.pushHistory();
        const shape = createShape('text', worldPt);
        actions.addShape(shape);
        actions.setSelected([shape.id]);
        onChanged?.();

        // Open text editor
        setEditingTextId(shape.id);
        setTextInputValue('');
        setTimeout(() => textInputRef.current?.focus(), 50);
        return;
      }

      // Drawing tools (pen, rect, ellipse, line, arrow)
      if (['pen', 'rectangle', 'ellipse', 'line', 'arrow'].includes(tool)) {
        engine.pushHistory();
        actions.setDrawing(true);
        const shape = createShape(tool as CanvasShape['type'], worldPt);
        activeShapeIdRef.current = shape.id;
        actions.addShape(shape);

        if (tool === 'pen') {
          drawingPointsRef.current = [worldPt];
        }

        dragStartRef.current = worldPt;
        (e.target as Element)?.setPointerCapture?.(e.pointerId);
        return;
      }

      // Select tool: hit test
      if (tool === 'select') {
        // Check shapes in reverse z-order (top to bottom)
        const sortedShapes = Object.values(state.shapes).sort((a, b) => b.zIndex - a.zIndex);
        let hitShape: CanvasShape | null = null;

        for (const shape of sortedShapes) {
          if (isPointInRotatedShape(worldPt, shape)) {
            hitShape = shape;
            break;
          }
        }

        if (hitShape) {
          // Select (or add to selection with shift)
          if (e.shiftKey) {
            const newIds = state.selectedIds.includes(hitShape.id)
              ? state.selectedIds.filter((id) => id !== hitShape!.id)
              : [...state.selectedIds, hitShape.id];
            actions.setSelected(newIds);
          } else if (!state.selectedIds.includes(hitShape.id)) {
            actions.setSelected([hitShape.id]);
          }

          // Start dragging
          actions.setDragging(true);
          dragStartRef.current = worldPt;
          (e.target as Element)?.setPointerCapture?.(e.pointerId);
        } else {
          // Clicked on empty space: deselect
          actions.setSelected([]);
        }
        return;
      }
    },
    [state, actions, engine, getWorldPoint, createShape, onChanged]
  );

  // ── Pointer Move ───────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      // Panning
      if (state.isPanning && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.mouseX;
        const dy = e.clientY - panStartRef.current.mouseY;
        actions.setCamera({
          ...state.camera,
          x: panStartRef.current.camX + dx,
          y: panStartRef.current.camY + dy,
        });
        return;
      }

      const worldPt = getWorldPoint(e);

      // Drawing
      if (state.isDrawing && activeShapeIdRef.current) {
        const tool = state.activeTool;
        const shapeId = activeShapeIdRef.current;

        if (tool === 'pen') {
          drawingPointsRef.current.push(worldPt);
          const pathData = pointsToRawPath(drawingPointsRef.current);
          actions.updateShape(shapeId, {
            points: [...drawingPointsRef.current],
            pathData,
          } as Partial<PenShape>);
        } else if (dragStartRef.current) {
          // Rectangle, ellipse, line, arrow: update width/height from drag delta
          const dx = worldPt.x - dragStartRef.current.x;
          const dy = worldPt.y - dragStartRef.current.y;

          if (tool === 'rectangle' || tool === 'ellipse') {
            // Normalize so width/height are always positive
            const x = dx >= 0 ? dragStartRef.current.x : worldPt.x;
            const y = dy >= 0 ? dragStartRef.current.y : worldPt.y;
            actions.updateShape(shapeId, {
              x,
              y,
              width: Math.abs(dx),
              height: Math.abs(dy),
            });
          } else {
            // Lines and arrows: width/height can be negative to indicate direction
            actions.updateShape(shapeId, {
              width: dx,
              height: dy,
            });
          }
        }
        return;
      }

      // Dragging selected shapes
      if (state.isDragging && dragStartRef.current && state.selectedIds.length > 0) {
        const dx = worldPt.x - dragStartRef.current.x;
        const dy = worldPt.y - dragStartRef.current.y;
        actions.moveShapes(state.selectedIds, dx, dy);
        dragStartRef.current = worldPt;
        return;
      }

      // Resizing & Rotating
      if ((state.isResizing || state.isRotating) && resizeStartRef.current) {
        const { handle, startMouse, originalShapes } = resizeStartRef.current;
        const dx = worldPt.x - startMouse.x;
        const dy = worldPt.y - startMouse.y;

        for (const id of state.selectedIds) {
          const orig = originalShapes[id];
          if (!orig) continue;

          if (handle === 'rotation') {
             // Calculate center of original shape
             let cx = orig.x + orig.width / 2;
             let cy = orig.y + orig.height / 2;
             if (orig.type === 'pen') {
               const bounds = getShapeBounds(orig);
               cx = (bounds.minX + bounds.maxX) / 2;
               cy = (bounds.minY + bounds.maxY) / 2;
             }
             
             // Calculate angle between shape center and mouse position
             // We add 90 degrees (PI/2) because our handle is visually above the shape (-y direction)
             let angle = Math.atan2(worldPt.y - cy, worldPt.x - cx) * (180 / Math.PI) + 90;
             actions.updateShape(id, { rotation: angle });
             continue;
          }

          let newX = orig.x;
          let newY = orig.y;
          let newW = orig.width;
          let newH = orig.height;

          if (handle.includes('e')) newW = orig.width + dx;
          if (handle.includes('w')) { newX = orig.x + dx; newW = orig.width - dx; }
          if (handle.includes('s')) newH = orig.height + dy;
          if (handle.includes('n')) { newY = orig.y + dy; newH = orig.height - dy; }

          // Enforce minimum size
          if (newW < 5) newW = 5;
          if (newH < 5) newH = 5;

          actions.updateShape(id, { x: newX, y: newY, width: newW, height: newH });
        }
        return;
      }
    },
    [state, actions, getWorldPoint]
  );

  // ── Pointer Up ─────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      // Finish panning
      if (state.isPanning) {
        actions.setPanning(false);
        panStartRef.current = null;
        return;
      }

      // Finish drawing
      if (state.isDrawing && activeShapeIdRef.current) {
        const shapeId = activeShapeIdRef.current;
        const tool = state.activeTool;

        if (tool === 'pen' && drawingPointsRef.current.length > 1) {
          // Simplify and smooth the path
          const simplified = simplifyPath(drawingPointsRef.current, 1.5);
          const pathData = pointsToSmoothPath(simplified);
          actions.updateShape(shapeId, {
            points: simplified,
            pathData,
          } as Partial<PenShape>);
        }

        // Remove zero-size shapes (accidental clicks)
        const shape = state.shapes[shapeId];
        if (shape && tool !== 'pen' && Math.abs(shape.width) < 2 && Math.abs(shape.height) < 2) {
          actions.deleteShapes([shapeId]);
        }

        actions.setDrawing(false);
        activeShapeIdRef.current = null;
        drawingPointsRef.current = [];
        dragStartRef.current = null;
        onChanged?.();
        return;
      }

      // Finish dragging
      if (state.isDragging) {
        actions.setDragging(false);
        dragStartRef.current = null;
        onChanged?.();
        return;
      }

      // Finish resizing / rotating
      if (state.isResizing || state.isRotating) {
        actions.setResizing(false);
        actions.setRotating(false);
        resizeStartRef.current = null;
        onChanged?.();
        return;
      }
    },
    [state, actions, onChanged]
  );

  // ── Shape Pointer Down (for selection) ─────────────────────
  const handleShapePointerDown = useCallback(
    (e: React.PointerEvent, shapeId: string) => {
      if (state.activeTool !== 'select') return;

      e.stopPropagation();
      const worldPt = getWorldPoint(e);

      if (e.shiftKey) {
        const newIds = state.selectedIds.includes(shapeId)
          ? state.selectedIds.filter((id) => id !== shapeId)
          : [...state.selectedIds, shapeId];
        actions.setSelected(newIds);
      } else if (!state.selectedIds.includes(shapeId)) {
        actions.setSelected([shapeId]);
      }

      // Start dragging
      engine.pushHistory();
      actions.setDragging(true);
      dragStartRef.current = worldPt;
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    },
    [state.activeTool, state.selectedIds, getWorldPoint, actions, engine]
  );

  // ── Handle Resize or Rotate ────────────────────────────────
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, handle: HandlePosition) => {
      e.stopPropagation();
      engine.pushHistory();
      const worldPt = getWorldPoint(e);

      // Snapshot shapes for delta calculation
      const originalShapes: Record<string, CanvasShape> = {};
      for (const id of state.selectedIds) {
        if (state.shapes[id]) {
          originalShapes[id] = { ...state.shapes[id] };
        }
      }

      resizeStartRef.current = {
        handle,
        startMouse: worldPt,
        originalShapes,
      };

      if (handle === 'rotation') {
        actions.setRotating(true);
      } else {
        actions.setResizing(true, handle);
      }
      
      (e.target as Element)?.setPointerCapture?.(e.pointerId);
    },
    [state.selectedIds, state.shapes, getWorldPoint, actions, engine]
  );

  // ── Double-click for text editing ──────────────────────────
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      if (state.activeTool !== 'select') return;
      const worldPt = screenToWorld(e.clientX, e.clientY, state.camera, getRect());

      const sortedShapes = Object.values(state.shapes).sort((a, b) => b.zIndex - a.zIndex);
      for (const shape of sortedShapes) {
        if (shape.type === 'text' && isPointInRotatedShape(worldPt, shape)) {
          setEditingTextId(shape.id);
          setTextInputValue((shape as TextShape).text);
          setTimeout(() => textInputRef.current?.focus(), 50);
          return;
        }
      }
    },
    [state, getRect]
  );

  // ── Commit text edit ───────────────────────────────────────
  const commitTextEdit = useCallback(() => {
    if (editingTextId) {
      if (textInputValue.trim()) {
        actions.updateShape(editingTextId, { text: textInputValue } as Partial<TextShape>);
      } else {
        // Delete empty text shapes
        actions.deleteShapes([editingTextId]);
      }
      setEditingTextId(null);
      setTextInputValue('');
      onChanged?.();
    }
  }, [editingTextId, textInputValue, actions, onChanged]);

  // ── Get sorted shapes ──────────────────────────────────────
  const sortedShapes = Object.values(state.shapes).sort((a, b) => a.zIndex - b.zIndex);
  const selectedShapes = state.selectedIds.map((id) => state.shapes[id]).filter(Boolean);

  // Derive active selection style if a single shape is selected
  const activeSelectionStyle = selectedShapes.length === 1
    ? {
        color: selectedShapes[0].color,
        strokeWidth: selectedShapes[0].strokeWidth,
        strokeStyle: selectedShapes[0].strokeStyle || 'solid',
        fill: selectedShapes[0].fill || 'transparent',
        fillStyle: selectedShapes[0].fillStyle || 'none',
        opacity: selectedShapes[0].opacity ?? 1,
        fontSize: (selectedShapes[0] as any).fontSize || state.toolStyle.fontSize,
        borderRadius: (selectedShapes[0] as any).borderRadius || 0,
      }
    : state.toolStyle;

  // ── Cursor ─────────────────────────────────────────────────
  const getCursor = () => {
    if (state.isPanning) return 'grabbing';
    if (state.activeTool === 'pan') return 'grab';
    if (state.isDragging) return 'move';
    if (state.isDrawing) return 'crosshair';
    if (state.activeTool === 'select') return 'default';
    return 'crosshair';
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-background select-none"
      style={{ cursor: getCursor() }}
    >
      {/* Grid background pattern */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ opacity: 0.4 }}
      >
        <defs>
          <pattern
            id="grid-small"
            width={20 * state.camera.zoom}
            height={20 * state.camera.zoom}
            patternUnits="userSpaceOnUse"
            x={state.camera.x % (20 * state.camera.zoom)}
            y={state.camera.y % (20 * state.camera.zoom)}
          >
            <circle
              cx={1}
              cy={1}
              r={0.8}
              fill="var(--muted)"
              opacity={0.3}
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid-small)" />
      </svg>

      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        className="absolute inset-0 w-full h-full"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
      >
        <g transform={getCameraTransform(state.camera)}>
          {/* Render all shapes */}
          {sortedShapes.map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={state.selectedIds.includes(shape.id)}
              onPointerDown={handleShapePointerDown}
            />
          ))}

          {/* Selection overlay */}
          {selectedShapes.length > 0 && state.activeTool === 'select' && !state.isDrawing && (
            <SelectionOverlay
              shapes={selectedShapes}
              onHandlePointerDown={handleResizePointerDown}
            />
          )}
        </g>
      </svg>

      {/* Text editing overlay (HTML on top of SVG) */}
      {editingTextId && state.shapes[editingTextId] && (
        <textarea
          ref={textInputRef}
          value={textInputValue}
          onChange={(e) => {
            setTextInputValue(e.target.value);
            // Dynamic text height auto-resize based on input contents
            if (textInputRef.current) {
              const currentHeight = textInputRef.current.scrollHeight;
              const worldHeight = currentHeight / state.camera.zoom;
              actions.updateShape(editingTextId, { height: Math.max(worldHeight, 30) });
            }
          }}
          onBlur={commitTextEdit}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              commitTextEdit();
            }
          }}
          className="absolute z-40 bg-transparent text-foreground border border-accent-blue/50 rounded-lg outline-none resize-none"
          style={{
            left: worldToScreen(state.shapes[editingTextId].x, state.shapes[editingTextId].y, state.camera).x - 2,
            top: worldToScreen(state.shapes[editingTextId].x, state.shapes[editingTextId].y, state.camera).y - 2,
            width: Math.max(state.shapes[editingTextId].width * state.camera.zoom, 120),
            height: Math.max(state.shapes[editingTextId].height * state.camera.zoom, 30),
            fontSize: ((state.shapes[editingTextId] as TextShape).fontSize || state.toolStyle.fontSize) * state.camera.zoom,
            fontFamily: 'Inter, system-ui, sans-serif',
            color: state.shapes[editingTextId].color || state.toolStyle.color,
            transform: state.shapes[editingTextId].rotation ? `rotate(${state.shapes[editingTextId].rotation}deg)` : undefined,
            transformOrigin: 'top left',
            padding: '2px 4px',
            lineHeight: 1.2
          }}
        />
      )}

      {/* Toolbar */}
      <CanvasToolbar
        activeTool={state.activeTool}
        toolStyle={activeSelectionStyle}
        onToolChange={actions.setTool}
        onStyleChange={(style) => {
          if (state.selectedIds.length > 0) {
            engine.pushHistory();
            for (const id of state.selectedIds) {
               actions.updateShape(id, style as Partial<CanvasShape>);
            }
          }
          actions.setToolStyle(style);
          onChanged?.();
        }}
        onUndo={() => { actions.undo(); onChanged?.(); }}
        onRedo={() => { actions.redo(); onChanged?.(); }}
        onDelete={() => {
          if (state.selectedIds.length > 0) {
            engine.pushHistory();
            actions.deleteShapes(state.selectedIds);
            onChanged?.();
          }
        }}
        onBringToFront={() => {
          if (state.selectedIds.length > 0) {
            engine.pushHistory();
            actions.bringToFront(state.selectedIds);
            onChanged?.();
          }
        }}
        onSendToBack={() => {
          if (state.selectedIds.length > 0) {
            engine.pushHistory();
            actions.sendToBack(state.selectedIds);
            onChanged?.();
          }
        }}
        hasSelection={state.selectedIds.length > 0}
      />

      {/* Zoom & Fullscreen Panel */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-surface/80 backdrop-blur border border-border/40 rounded-lg p-1.5 shadow-md">
        <div className="px-2 py-0.5 text-xs text-muted font-medium">
          {Math.round(state.camera.zoom * 100)}%
        </div>
        <div className="w-px h-4 bg-border/40" />
        <button
          onClick={toggleFullscreen}
          className="p-1 text-muted hover:text-foreground hover:bg-surface-hover rounded transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
      </div>
    </div>
  );
}

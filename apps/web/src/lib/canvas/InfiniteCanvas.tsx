// ============================================================
// Custom Canvas Engine - InfiniteCanvas SVG Viewport
// ============================================================

'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Compass, Download, Keyboard, HelpCircle } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { CanvasToolbar } from './CanvasToolbar';
import type { CanvasEngine } from './useCanvasEngine';
import type { RemoteCursor, CommentPin } from './types';
import { MessageSquare, Check, X } from 'lucide-react';

interface InfiniteCanvasProps {
  engine: CanvasEngine;
  onChanged?: () => void;
  onPointerMoveWorld?: (point: Point) => void;
  remoteCursors?: Record<string, RemoteCursor>;
  comments?: CommentPin[];
  onAddComment?: (point: Point, content: string) => void;
  onToggleResolveComment?: (commentId: string) => void;
}

export function InfiniteCanvas({
  engine,
  onChanged,
  onPointerMoveWorld,
  remoteCursors,
  comments,
  onAddComment,
  onToggleResolveComment,
}: InfiniteCanvasProps) {
  const { state, ...actions } = engine;
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Comment pin transient state
  const [pendingCommentPt, setPendingCommentPt] = useState<Point | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [activeCommentId, setActiveCommentId] = useState<string | null>(null);

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

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
  const isErasingRef = useRef(false);

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

  // ── Fit to Screen ──────────────────────────────────────────
  const fitToScreen = useCallback(() => {
    const shapeList = Object.values(state.shapes);
    if (shapeList.length === 0) {
      actions.setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const shape of shapeList) {
      const bounds = getShapeBounds(shape);
      if (bounds.minX < minX) minX = bounds.minX;
      if (bounds.minY < minY) minY = bounds.minY;
      if (bounds.maxX > maxX) maxX = bounds.maxX;
      if (bounds.maxY > maxY) maxY = bounds.maxY;
    }

    const rect = getRect();
    const padding = 60;
    const contentW = maxX - minX;
    const contentH = maxY - minY;

    if (contentW <= 0 || contentH <= 0) {
      actions.setCamera({ x: 0, y: 0, zoom: 1 });
      return;
    }

    const zoomX = (rect.width - padding * 2) / contentW;
    const zoomY = (rect.height - padding * 2) / contentH;
    const bestZoom = Math.max(0.1, Math.min(10, Math.min(zoomX, zoomY)));

    const centerX = minX + contentW / 2;
    const centerY = minY + contentH / 2;

    const newCamX = rect.width / 2 - centerX * bestZoom;
    const newCamY = rect.height / 2 - centerY * bestZoom;

    actions.setCamera({ x: newCamX, y: newCamY, zoom: bestZoom });
  }, [state.shapes, actions, getRect]);

  // ── Export as SVG ──────────────────────────────────────────
  const exportToSVG = useCallback(() => {
    const shapeList = Object.values(state.shapes);
    if (shapeList.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const shape of shapeList) {
      const bounds = getShapeBounds(shape);
      if (bounds.minX < minX) minX = bounds.minX;
      if (bounds.minY < minY) minY = bounds.minY;
      if (bounds.maxX > maxX) maxX = bounds.maxX;
      if (bounds.maxY > maxY) maxY = bounds.maxY;
    }

    const width = maxX - minX + 80;
    const height = maxY - minY + 80;
    const viewX = minX - 40;
    const viewY = minY - 40;

    const groupEl = svgRef.current?.querySelector('g');
    if (!groupEl) return;

    const clone = groupEl.cloneNode(true) as SVGGElement;
    clone.removeAttribute('transform');

    const overlay = clone.querySelector('.selection-overlay');
    if (overlay) overlay.remove();

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${width} ${height}" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#0f172a" />
        ${clone.innerHTML}
      </svg>
    `.trim();

    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `myspace-drawing-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  }, [state.shapes]);

  // ── Export as PNG ──────────────────────────────────────────
  const exportToPNG = useCallback(() => {
    const shapeList = Object.values(state.shapes);
    if (shapeList.length === 0) return;

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const shape of shapeList) {
      const bounds = getShapeBounds(shape);
      if (bounds.minX < minX) minX = bounds.minX;
      if (bounds.minY < minY) minY = bounds.minY;
      if (bounds.maxX > maxX) maxX = bounds.maxX;
      if (bounds.maxY > maxY) maxY = bounds.maxY;
    }

    const width = maxX - minX + 80;
    const height = maxY - minY + 80;
    const viewX = minX - 40;
    const viewY = minY - 40;

    const groupEl = svgRef.current?.querySelector('g');
    if (!groupEl) return;

    const clone = groupEl.cloneNode(true) as SVGGElement;
    clone.removeAttribute('transform');

    const overlay = clone.querySelector('.selection-overlay');
    if (overlay) overlay.remove();

    const svgString = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewX} ${viewY} ${width} ${height}" width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#0f172a" />
        ${clone.innerHTML}
      </svg>
    `.trim();

    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(image, 0, 0);
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `myspace-drawing-${Date.now()}.png`;
        link.click();
      }
      URL.revokeObjectURL(svgUrl);
    };

    image.src = svgUrl;
  }, [state.shapes]);

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
          return { ...base, type: 'arrow', arrowHead: 'end', arrowStyle: 'straight' } as ArrowShape;
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
        case 'sticky-note':
          return {
            ...base,
            type: 'sticky-note',
            text: '',
            fontSize: 14,
            noteColor: '#fef08a',
            fill: '#fef08a',
            width: 160,
            height: 160,
          } as any;
        case 'diamond':
        case 'triangle':
        case 'star':
        case 'hexagon':
        case 'parallelogram':
        case 'trapezoid':
        case 'cylinder':
        case 'callout':
          return { ...base, type } as CanvasShape;
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
        e: 'eraser',
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
        svgRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      // Comment tool
      if (tool === 'comment') {
        setPendingCommentPt(worldPt);
        setNewCommentText('');
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

      // Eraser tool
      if (tool === 'eraser') {
        engine.pushHistory();
        isErasingRef.current = true;
        svgRef.current?.setPointerCapture(e.pointerId);

        // Perform immediate hit-test on down
        const toDelete: string[] = [];
        for (const shape of Object.values(state.shapes)) {
          if (isPointInRotatedShape(worldPt, shape, 12)) {
            toDelete.push(shape.id);
          }
        }
        if (toDelete.length > 0) {
          actions.deleteShapes(toDelete);
        }
        return;
      }

      // Drawing tools (pen, rect, ellipse, line, arrow, and new shapes)
      if (['pen', 'rectangle', 'ellipse', 'line', 'arrow', 'diamond', 'triangle', 'star', 'hexagon', 'parallelogram', 'trapezoid', 'cylinder', 'callout'].includes(tool)) {
        engine.pushHistory();
        actions.setDrawing(true);
        const shape = createShape(tool as CanvasShape['type'], worldPt);
        activeShapeIdRef.current = shape.id;
        actions.addShape(shape);

        if (tool === 'pen') {
          drawingPointsRef.current = [worldPt];
        }

        dragStartRef.current = worldPt;
        svgRef.current?.setPointerCapture(e.pointerId);
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
          svgRef.current?.setPointerCapture(e.pointerId);
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
      onPointerMoveWorld?.(worldPt);

      // Erasing
      if (isErasingRef.current) {
        const toDelete: string[] = [];
        for (const shape of Object.values(state.shapes)) {
          if (isPointInRotatedShape(worldPt, shape, 16)) {
            toDelete.push(shape.id);
          }
        }
        if (toDelete.length > 0) {
          actions.deleteShapes(toDelete);
        }
        return;
      }

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

          if (['rectangle', 'ellipse', 'diamond', 'triangle', 'star', 'hexagon', 'parallelogram', 'trapezoid', 'cylinder', 'callout'].includes(tool)) {
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

      // Finish erasing
      if (isErasingRef.current) {
        isErasingRef.current = false;
        onChanged?.();
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
      svgRef.current?.setPointerCapture(e.pointerId);
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
      
      svgRef.current?.setPointerCapture(e.pointerId);
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
        <defs>
          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
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

          {/* Remote Cursors Overlay */}
          {remoteCursors && Object.values(remoteCursors).map((cursor) => (
            <g
              key={cursor.userId}
              transform={`translate(${cursor.x}, ${cursor.y})`}
              className="pointer-events-none transition-transform duration-75"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill={cursor.color} stroke="#ffffff" strokeWidth="1.5">
                <path d="M5.653 3.123A.75.75 0 0 0 4.5 3.75v16.5a.75.75 0 0 0 1.28.53l4.72-4.72h6.25a.75.75 0 0 0 .53-1.28L5.653 3.123z" />
              </svg>
              <g transform="translate(14, 14)">
                <rect
                  rx="4"
                  ry="4"
                  width={Math.max(60, (cursor.name || 'User').length * 8 + 12)}
                  height="20"
                  fill={cursor.color}
                />
                <text
                  x="6"
                  y="14"
                  fill="#ffffff"
                  fontSize="11"
                  fontWeight="600"
                  fontFamily="Inter, sans-serif"
                >
                  {cursor.name || 'User'}
                </text>
              </g>
            </g>
          ))}

          {/* Render Comment Pins */}
          {comments?.map((c) => (
            <g
              key={c.id}
              transform={`translate(${c.x}, ${c.y})`}
              className="cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setActiveCommentId(activeCommentId === c.id ? null : c.id);
              }}
            >
              <circle
                r="13"
                fill={c.isResolved ? '#64748b' : '#0ea5e9'}
                stroke="#ffffff"
                strokeWidth="2"
                className="shadow-md transition-transform hover:scale-110"
              />
              <text x="0" y="4" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="bold">
                💬
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Active Comment Card Popover */}
      {activeCommentId && (() => {
        const comment = comments?.find((c) => c.id === activeCommentId);
        if (!comment) return null;
        const screenPt = worldToScreen(comment.x, comment.y, state.camera);
        return (
          <div
            style={{ left: screenPt.x + 18, top: screenPt.y - 20 }}
            className="absolute z-40 w-64 rounded-2xl border border-border bg-surface/95 backdrop-blur p-3.5 shadow-2xl space-y-2 pointer-events-auto"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground">{comment.userName}</span>
              <button
                onClick={() => setActiveCommentId(null)}
                className="p-1 text-muted hover:text-foreground"
              >
                <X size={14} />
              </button>
            </div>
            <p className="text-xs text-foreground leading-relaxed">{comment.content}</p>
            <div className="flex items-center justify-between pt-1.5 text-[10px] text-muted border-t border-border/60">
              <span>{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              <button
                onClick={() => {
                  onToggleResolveComment?.(comment.id);
                  setActiveCommentId(null);
                }}
                className={`flex items-center gap-1 font-semibold ${comment.isResolved ? 'text-muted' : 'text-accent-green'}`}
              >
                <Check size={12} /> {comment.isResolved ? 'Resolved' : 'Resolve'}
              </button>
            </div>
          </div>
        );
      })()}

      {/* New Comment Creator Popover */}
      {pendingCommentPt && (() => {
        const screenPt = worldToScreen(pendingCommentPt.x, pendingCommentPt.y, state.camera);
        return (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (newCommentText.trim()) {
                onAddComment?.(pendingCommentPt, newCommentText.trim());
                setPendingCommentPt(null);
                setNewCommentText('');
              }
            }}
            style={{ left: screenPt.x + 18, top: screenPt.y - 20 }}
            className="absolute z-40 w-64 rounded-2xl border border-border bg-surface p-3 shadow-2xl space-y-2 pointer-events-auto"
          >
            <textarea
              autoFocus
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              placeholder="Leave a comment pin..."
              className="w-full rounded-xl border border-border bg-background p-2.5 text-xs text-foreground outline-none focus:border-accent-blue min-h-[60px]"
            />
            <div className="flex justify-end gap-1.5">
              <button
                type="button"
                onClick={() => setPendingCommentPt(null)}
                className="px-2.5 py-1 text-xs text-muted hover:text-foreground"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!newCommentText.trim()}
                className="px-3 py-1 bg-accent-blue text-white rounded-lg text-xs font-semibold disabled:opacity-50"
              >
                Post Pin
              </button>
            </div>
          </form>
        );
      })()}

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

      {/* Canvas Utilities & Controls Panel */}
      <div className="absolute top-4 right-4 z-30 flex items-center gap-1 bg-surface/85 backdrop-blur-xl border border-border/50 rounded-xl p-1 shadow-lg pointer-events-auto">
        {/* Zoom Out */}
        <button
          onClick={() => actions.setCamera({ ...state.camera, zoom: Math.max(0.1, state.camera.zoom - 0.15) })}
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
          title="Zoom Out"
        >
          <ZoomOut size={15} />
        </button>

        {/* Zoom Label */}
        <button
          onClick={() => actions.setCamera({ ...state.camera, zoom: 1 })}
          className="px-2 py-1 text-xs text-muted hover:text-foreground hover:bg-surface-hover rounded-lg font-semibold transition-colors"
          title="Reset Zoom to 100%"
        >
          {Math.round(state.camera.zoom * 100)}%
        </button>

        {/* Zoom In */}
        <button
          onClick={() => actions.setCamera({ ...state.camera, zoom: Math.min(10, state.camera.zoom + 0.15) })}
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
          title="Zoom In"
        >
          <ZoomIn size={15} />
        </button>

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        {/* Fit to Screen */}
        <button
          onClick={fitToScreen}
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
          title="Fit to Screen"
        >
          <Compass size={15} />
        </button>

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        {/* Export Dropdown Trigger */}
        <div className="relative group">
          <button
            className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors flex items-center gap-0.5"
            title="Export Drawing"
          >
            <Download size={15} />
          </button>
          
          {/* Dropdown Options */}
          <div className="absolute right-0 top-full mt-1.5 hidden group-hover:block bg-surface/95 backdrop-blur border border-border/50 rounded-xl p-1 shadow-xl min-w-[120px]">
            <button
              onClick={exportToPNG}
              className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-hover rounded-lg font-medium transition-colors"
            >
              Export as PNG
            </button>
            <button
              onClick={exportToSVG}
              className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-hover rounded-lg font-medium transition-colors"
            >
              Export as SVG
            </button>
          </div>
        </div>

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        {/* Keyboard Shortcuts */}
        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className={`p-1.5 rounded-lg transition-colors ${showShortcuts ? 'text-accent-blue bg-accent-blue/10' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
          title="Keyboard Shortcuts"
        >
          <Keyboard size={15} />
        </button>

        <div className="w-px h-5 bg-border/40 mx-0.5" />

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 text-muted hover:text-foreground hover:bg-surface-hover rounded-lg transition-colors"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
        </button>
      </div>

      {/* Keyboard Shortcuts Overlay Modal */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-16 right-4 z-40 bg-surface/95 backdrop-blur-xl border border-border/60 rounded-2xl p-4 shadow-2xl w-[260px] text-zinc-300 pointer-events-auto"
          >
            <div className="flex justify-between items-center mb-3">
              <h4 className="font-semibold text-white text-sm">Keyboard Shortcuts</h4>
              <button onClick={() => setShowShortcuts(false)} className="text-zinc-500 hover:text-zinc-300 text-xs">Close</button>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between"><span>Select Tool</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">V</kbd></div>
              <div className="flex justify-between"><span>Hand / Pan</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">H</kbd></div>
              <div className="flex justify-between"><span>Pen / Freehand</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">P</kbd></div>
              <div className="flex justify-between"><span>Eraser Tool</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">E</kbd></div>
              <div className="flex justify-between"><span>Rectangle</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">R</kbd></div>
              <div className="flex justify-between"><span>Circle / Ellipse</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">O</kbd></div>
              <div className="flex justify-between"><span>Line</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">L</kbd></div>
              <div className="flex justify-between"><span>Arrow</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">A</kbd></div>
              <div className="flex justify-between"><span>Text</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">T</kbd></div>
              <div className="h-px bg-border/40 my-2" />
              <div className="flex justify-between"><span>Delete Selection</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">Del / Backspace</kbd></div>
              <div className="flex justify-between"><span>Undo</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">⌘ Z</kbd></div>
              <div className="flex justify-between"><span>Redo</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">⌘ ⇧ Z</kbd></div>
              <div className="flex justify-between"><span>Deselect / Cancel</span><kbd className="bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 font-mono text-[10px]">Esc</kbd></div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

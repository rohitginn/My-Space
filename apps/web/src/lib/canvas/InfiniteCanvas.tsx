// ============================================================
// Custom Canvas Engine - InfiniteCanvas SVG Viewport
// ============================================================

'use client';

import React, { useRef, useCallback, useEffect, useMemo, useState } from 'react';
import { Maximize2, Minimize2, ZoomIn, ZoomOut, Compass, LocateFixed, Download, Keyboard, Grid3X3, ImagePlus, Plus, Trash2, MoreHorizontal, Copy, Lock, Unlock, ChevronUp, ChevronDown } from 'lucide-react';
import type { Point, AABB, CanvasShape, CanvasDocument, PenShape, TextShape, HandlePosition, ToolType } from './types';
import {
  screenToWorld, worldToScreen, getCameraTransform, zoomAtPoint,
  isPointInRotatedShape, simplifyPath, pointsToSmoothPath,
  pointsToRawPath, generateId, getShapeBounds, aabbOverlap,
  getViewportBounds, rotatePoint,
} from './math';
import { motion, AnimatePresence } from 'framer-motion';
import { ShapeRenderer } from './ShapeRenderer';
import { SelectionOverlay } from './SelectionOverlay';
import { CanvasToolbar } from './CanvasToolbar';
import { getConnectionPoints, getSelectionBounds } from './geometry';
import { createRegisteredShape } from './shapeRegistry';
import { htmlToRichText, plainTextToRichText, richTextToHtml, richTextToPlainText } from './richText';
import type { CanvasEngine } from './useCanvasEngine';
import type { RemoteCursor, CommentPin } from './types';
import { Check, X } from 'lucide-react';

interface InfiniteCanvasProps {
  engine: CanvasEngine;
  onChanged?: () => void;
  onPointerMoveWorld?: (point: Point) => void;
  remoteCursors?: Record<string, RemoteCursor>;
  comments?: CommentPin[];
  commentAuthor?: { name: string; avatarUrl?: string | null };
  onAddComment?: (point: Point, content: string) => void;
  onToggleResolveComment?: (commentId: string) => void;
}

function initialsFor(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('') || 'ME';
}

function CommentAvatar({ name, avatarUrl, size = 'sm' }: { name: string; avatarUrl?: string | null; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'md' ? 'h-8 w-8 text-[11px]' : 'h-6 w-6 text-[9px]';
  return (
    <span className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent-blue/15 font-semibold text-accent-blue ${sizeClass}`}>
      {avatarUrl ? <img src={avatarUrl} alt="" className="h-full w-full object-cover" /> : initialsFor(name)}
    </span>
  );
}

function isTextEntryTarget(target: EventTarget | null) {
  const element = target instanceof HTMLElement ? target : null;
  return !!element && (element.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));
}

const MINIMAP_WIDTH = 190;
const MINIMAP_HEIGHT = 118;

function CanvasMiniMap({
  shapes,
  viewport,
  onNavigate,
}: {
  shapes: CanvasShape[];
  viewport: AABB;
  onNavigate: (point: Point) => void;
}) {
  const contentBounds = getSelectionBounds(shapes);
  if (!contentBounds) return null;

  const rawWidth = contentBounds.maxX - contentBounds.minX;
  const rawHeight = contentBounds.maxY - contentBounds.minY;
  const padding = Math.max(24, Math.min(Math.max(rawWidth, rawHeight) * 0.12, 240));
  const viewBox = {
    minX: contentBounds.minX - padding,
    minY: contentBounds.minY - padding,
    width: Math.max(1, rawWidth + padding * 2),
    height: Math.max(1, rawHeight + padding * 2),
  };
  const viewMaxX = viewBox.minX + viewBox.width;
  const viewMaxY = viewBox.minY + viewBox.height;
  const viewportIntersectsMap = aabbOverlap(viewport, {
    minX: viewBox.minX,
    minY: viewBox.minY,
    maxX: viewMaxX,
    maxY: viewMaxY,
  });
  const viewportCenter = {
    x: Math.min(viewMaxX - 6, Math.max(viewBox.minX + 6, (viewport.minX + viewport.maxX) / 2)),
    y: Math.min(viewMaxY - 6, Math.max(viewBox.minY + 6, (viewport.minY + viewport.maxY) / 2)),
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    onNavigate({
      x: viewBox.minX + ((event.clientX - rect.left) / rect.width) * viewBox.width,
      y: viewBox.minY + ((event.clientY - rect.top) / rect.height) * viewBox.height,
    });
  };

  return (
    <div className="absolute bottom-20 right-4 z-30 w-[190px] rounded-xl border border-border/70 bg-surface/90 p-2 shadow-lg backdrop-blur-xl pointer-events-auto">
      <div className="mb-1.5 flex items-center justify-between px-1 text-[10px] font-semibold text-muted">
        <span>Canvas map</span>
        <span className="text-accent-blue">you are here</span>
      </div>
      <svg
        viewBox={`${viewBox.minX} ${viewBox.minY} ${viewBox.width} ${viewBox.height}`}
        width={MINIMAP_WIDTH - 16}
        height={MINIMAP_HEIGHT - 30}
        className="block h-auto w-full cursor-crosshair rounded-md bg-background/70"
        role="img"
        aria-label="Canvas map. Click to move the viewport."
        onPointerDown={handlePointerDown}
        style={{ touchAction: 'none' }}
      >
        <rect x={viewBox.minX} y={viewBox.minY} width={viewBox.width} height={viewBox.height} fill="transparent" />
        {shapes.map((shape) => {
          const bounds = getShapeBounds(shape);
          const hasFill = shape.fillStyle !== 'none' && shape.fill !== 'transparent' && shape.fill !== 'none';
          return (
            <rect
              key={shape.id}
              x={bounds.minX}
              y={bounds.minY}
              width={Math.max(2, bounds.maxX - bounds.minX)}
              height={Math.max(2, bounds.maxY - bounds.minY)}
              fill={hasFill ? shape.fill : 'none'}
              fillOpacity={hasFill ? 0.45 : 0}
              stroke={shape.color}
              strokeWidth={1.25}
              vectorEffect="non-scaling-stroke"
              opacity={0.85}
            />
          );
        })}
        <rect
          x={viewport.minX}
          y={viewport.minY}
          width={Math.max(1, viewport.maxX - viewport.minX)}
          height={Math.max(1, viewport.maxY - viewport.minY)}
          fill="var(--accent-blue)"
          fillOpacity={0.08}
          stroke="var(--accent-blue)"
          strokeWidth={2}
          strokeDasharray="6 4"
          vectorEffect="non-scaling-stroke"
        />
        {!viewportIntersectsMap && (
          <circle
            cx={viewportCenter.x}
            cy={viewportCenter.y}
            r={5}
            fill="var(--accent-blue)"
            stroke="var(--surface)"
            strokeWidth={2}
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>
    </div>
  );
}

function resizeShapePatch(shape: CanvasShape, x: number, y: number, width: number, height: number): Partial<CanvasShape> {
  const patch = { x, y, width, height } as Partial<CanvasShape> & { start?: Point; end?: Point; points?: Point[]; pathData?: string };
  if (shape.type === 'arrow') {
    const start = shape.start ?? { x: shape.x, y: shape.y };
    const end = shape.end ?? { x: shape.x + shape.width, y: shape.y + shape.height };
    const scaleX = shape.width ? width / shape.width : 1;
    const scaleY = shape.height ? height / shape.height : 1;
    patch.start = { x: x + (start.x - shape.x) * scaleX, y: y + (start.y - shape.y) * scaleY };
    patch.end = { x: x + (end.x - shape.x) * scaleX, y: y + (end.y - shape.y) * scaleY };
  }
  if (shape.type === 'pen' || shape.type === 'highlighter') {
    const scaleX = shape.width ? width / shape.width : 1;
    const scaleY = shape.height ? height / shape.height : 1;
    patch.points = shape.points.map((point) => ({ x: x + (point.x - shape.x) * scaleX, y: y + (point.y - shape.y) * scaleY, pressure: point.pressure }));
    patch.pathData = pointsToSmoothPath(patch.points);
  }
  return patch as Partial<CanvasShape>;
}

export function InfiniteCanvas({
  engine,
  onChanged,
  onPointerMoveWorld,
  remoteCursors,
  comments,
  commentAuthor,
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
  const drawFrameRef = useRef<number | null>(null);
  const dragStartRef = useRef<Point | null>(null);
  const panStartRef = useRef<{ camX: number; camY: number; mouseX: number; mouseY: number } | null>(null);
  const resizeStartRef = useRef<{
    handle: HandlePosition;
    startMouse: Point;
    originalShapes: Record<string, CanvasShape>;
    shiftKey: boolean;
    altKey: boolean;
    startAngle: number;
  } | null>(null);
  const activeShapeIdRef = useRef<string | null>(null);
  const isErasingRef = useRef(false);
  const marqueeStartRef = useRef<Point | null>(null);
  const isMarqueeSelectingRef = useRef(false);
  const marqueeAdditiveRef = useRef(false);
  const clipboardRef = useRef<CanvasShape[]>([]);
  const [selectionBox, setSelectionBox] = useState<AABB | null>(null);
  const [pageControlsOpen, setPageControlsOpen] = useState(false);
  const [pageNameDraft, setPageNameDraft] = useState('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; shapeIds: string[] } | null>(null);
  const touchPointsRef = useRef(new Map<number, Point>());
  const pinchRef = useRef<{ center: Point; distance: number } | null>(null);
  const spacePressedRef = useRef(false);
  const [debugMode, setDebugMode] = useState(false);
  const [debugPointer, setDebugPointer] = useState<Point | null>(null);

  // For text editing overlay
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [showLinkEditor, setShowLinkEditor] = useState(false);
  const [linkDraft, setLinkDraft] = useState('');
  const [urlEditor, setUrlEditor] = useState<{ shapeId: string; type: 'bookmark' | 'embed' } | null>(null);
  const [urlDraft, setUrlDraft] = useState('');
  const textInputRef = useRef<HTMLDivElement>(null);
  const textSelectionRef = useRef<Range | null>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // ── Helper: get container rect ─────────────────────────────
  const getRect = useCallback(() => {
    return containerRef.current?.getBoundingClientRect() ?? new DOMRect();
  }, []);

  const importImage = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return;
      const assetId = `asset:${Date.now()}`;
      const image = new Image();
      image.onload = () => {
        const rect = getRect();
        const center = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, state.camera, rect);
        const width = Math.min(480, image.naturalWidth || 480);
        const height = Math.max(1, width * ((image.naturalHeight || 320) / (image.naturalWidth || 480)));
        engine.run(() => {
          actions.createAsset({ id: assetId, type: 'image', src, mimeType: file.type, width: image.naturalWidth, height: image.naturalHeight, name: file.name, sizeBytes: file.size });
          actions.addShape({ ...createRegisteredShape('image', { id: generateId(), point: { x: center.x - width / 2, y: center.y - height / 2 }, style: state.toolStyle, zIndex: Object.keys(state.shapes).length }), assetId, width, height } as CanvasShape);
        });
        onChanged?.();
      };
      image.src = src;
    };
    reader.readAsDataURL(file);
  }, [actions, engine, getRect, onChanged, state.camera, state.shapes, state.toolStyle]);

  const importMedia = useCallback((file: File) => {
    if (file.type.startsWith('image/')) {
      importImage(file);
      return;
    }
    if (!file.type.startsWith('video/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = typeof reader.result === 'string' ? reader.result : '';
      if (!src) return;
      const rect = getRect();
      const center = screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2, state.camera, rect);
      const assetId = `asset:${Date.now()}`;
      const shapeId = generateId();
      engine.run(() => {
        actions.createAsset({ id: assetId, type: 'video', src, mimeType: file.type, name: file.name, sizeBytes: file.size });
        actions.addShape({ ...createRegisteredShape('video', { id: shapeId, point: { x: center.x - 160, y: center.y - 100 }, style: state.toolStyle, zIndex: Object.keys(state.shapes).length }), assetId } as CanvasShape);
      });
      actions.setSelected([shapeId]);
      onChanged?.();
    };
    reader.readAsDataURL(file);
  }, [actions, createRegisteredShape, engine, getRect, importImage, onChanged, state.camera, state.shapes, state.toolStyle]);

  const handleCanvasDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (file) importMedia(file);
  }, [importMedia]);

  const handleCanvasPaste = useCallback((event: React.ClipboardEvent<HTMLDivElement>) => {
    const file = Array.from(event.clipboardData.files).find((candidate) => candidate.type.startsWith('image/') || candidate.type.startsWith('video/'));
    if (file) {
      event.preventDefault();
      importMedia(file);
    }
  }, [importMedia]);

  const exportToJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(engine.getDocument(), null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `myspace-canvas-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [engine]);

  const importJSON = useCallback((file: File) => {
    file.text().then((content) => {
      try {
        const parsed = JSON.parse(content) as CanvasDocument;
        engine.loadDocument(parsed);
        onChanged?.();
      } catch {
        // Import failures stay local to the picker; the existing document is untouched.
      }
    });
  }, [engine, onChanged]);

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
    image.onerror = () => URL.revokeObjectURL(svgUrl);

    image.src = svgUrl;
  }, [state.shapes]);

  // ── Shape creation helpers ─────────────────────────────────
  const createShape = useCallback(
    (type: CanvasShape['type'], worldPt: Point): CanvasShape => {
      const shape = createRegisteredShape(type, {
        id: generateId(),
        point: worldPt,
        style: state.toolStyle,
        zIndex: Object.keys(state.shapes).length,
      });
      const containingFrame = Object.values(state.shapes)
        .filter((candidate) => {
          if (candidate.type !== 'frame' || candidate.id === shape.id) return false;
          const bounds = getShapeBounds(candidate);
          return worldPt.x >= bounds.minX && worldPt.x <= bounds.maxX && worldPt.y >= bounds.minY && worldPt.y <= bounds.maxY;
        })
        .sort((a, b) => Math.abs(a.width * a.height) - Math.abs(b.width * b.height))[0];
      return { ...shape, parentId: containingFrame?.id ?? state.currentPageId } as CanvasShape;
    },
    [state.currentPageId, state.toolStyle, state.shapes]
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
      // Let inputs, textareas, selects, and contenteditable surfaces own their
      // keystrokes. In particular, Space must not start canvas panning while a
      // comment is being written.
      if (isTextEntryTarget(e.target)) return;

      // Delete selected
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.selectedIds.length > 0 && !editingTextId) {
        engine.pushHistory();
        actions.deleteShapes(state.selectedIds);
        onChanged?.();
        return;
      }

      const mod = e.metaKey || e.ctrlKey;
      if (e.code === 'Space' && !editingTextId) {
        e.preventDefault();
        spacePressedRef.current = true;
        return;
      }
      if (mod && e.key.toLowerCase() === 'a' && !editingTextId) {
        e.preventDefault();
        actions.setSelected(Object.values(state.shapes).filter((shape) => !shape.locked).map((shape) => shape.id));
        return;
      }

      if (mod && e.key.toLowerCase() === 'c' && state.selectedIds.length > 0 && !editingTextId) {
        e.preventDefault();
        clipboardRef.current = state.selectedIds
          .map((id) => state.shapes[id])
          .filter(Boolean)
          .map((shape) => structuredClone(shape));
        return;
      }

      if (mod && e.key.toLowerCase() === 'x' && state.selectedIds.length > 0 && !editingTextId) {
        e.preventDefault();
        clipboardRef.current = state.selectedIds
          .map((id) => state.shapes[id])
          .filter(Boolean)
          .map((shape) => structuredClone(shape));
        engine.pushHistory();
        actions.deleteShapes(state.selectedIds);
        onChanged?.();
        return;
      }

      if (mod && e.key.toLowerCase() === 'v' && clipboardRef.current.length > 0 && !editingTextId) {
        e.preventDefault();
        const pasted = clipboardRef.current.map((shape, index) => ({
          ...structuredClone(shape),
          id: generateId(),
          x: shape.x + 24,
          y: shape.y + 24,
          zIndex: Object.keys(state.shapes).length + index,
          pageId: undefined,
          parentId: undefined,
        } as CanvasShape));
        engine.pushHistory();
        pasted.forEach((shape) => actions.addShape(shape));
        actions.setSelected(pasted.map((shape) => shape.id));
        onChanged?.();
        return;
      }

      if (mod && e.key.toLowerCase() === 'd' && state.selectedIds.length > 0 && !editingTextId) {
        e.preventDefault();
        duplicateShapes(state.selectedIds);
        return;
      }

      if (mod && e.key.toLowerCase() === 'g' && !editingTextId) {
        e.preventDefault();
        if (e.shiftKey && state.selectedIds.length === 1 && state.shapes[state.selectedIds[0]]?.meta?.isGroup === true) {
          actions.ungroup(state.selectedIds[0]);
          onChanged?.();
        } else if (!e.shiftKey) {
          groupSelection(state.selectedIds);
        }
        return;
      }

      if (mod && e.key.toLowerCase() === 'l' && state.selectedIds.length > 0 && !editingTextId) {
        e.preventDefault();
        const locked = state.selectedIds.every((id) => state.shapes[id]?.locked);
        actions.lockShapes(state.selectedIds, !locked);
        onChanged?.();
        return;
      }

      if (!editingTextId && state.selectedIds.length > 0 && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 1;
        const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
        const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
        engine.pushHistory();
        actions.moveShapesWithSnapping(state.selectedIds, dx, dy);
        onChanged?.();
        return;
      }

      // Undo
      if (mod && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        actions.undo();
        onChanged?.();
        return;
      }

      // Redo
      if (mod && e.key === 'z' && e.shiftKey) {
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
      if (!mod && !e.altKey && toolShortcuts[e.key] && !editingTextId) {
        actions.setTool(toolShortcuts[e.key]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') spacePressedRef.current = false;
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.selectedIds, state.shapes, editingTextId, engine, actions, onChanged]);

  // ── Pointer Down ───────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return; // Only left-click
      setContextMenu(null);

      if (e.pointerType === 'touch') {
        touchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (touchPointsRef.current.size === 1) {
          actions.setPanning(true);
          panStartRef.current = { camX: state.camera.x, camY: state.camera.y, mouseX: e.clientX, mouseY: e.clientY };
        } else if (touchPointsRef.current.size >= 2) {
          const points = Array.from(touchPointsRef.current.values()).slice(0, 2);
          const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
          pinchRef.current = { center, distance: Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y)) };
          panStartRef.current = null;
        }
        svgRef.current?.setPointerCapture(e.pointerId);
        return;
      }

      const worldPt = getWorldPoint(e);
      const tool = state.activeTool;

      if (spacePressedRef.current) {
        actions.setPanning(true);
        panStartRef.current = { camX: state.camera.x, camY: state.camera.y, mouseX: e.clientX, mouseY: e.clientY };
        svgRef.current?.setPointerCapture(e.pointerId);
        return;
      }

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
          if (!shape.locked && isPointInRotatedShape(worldPt, shape, 12)) {
            toDelete.push(shape.id);
          }
        }
        if (toDelete.length > 0) {
          actions.deleteShapes(toDelete);
        }
        return;
      }

      // Drawing tools (pen, rect, ellipse, line, arrow, and new shapes)
      if (['pen', 'highlighter', 'rectangle', 'ellipse', 'line', 'arrow', 'diamond', 'triangle', 'star', 'hexagon', 'octagon', 'cloud', 'parallelogram', 'trapezoid', 'cylinder', 'callout', 'frame', 'sticky-note', 'video', 'bookmark', 'embed'].includes(tool)) {
        engine.pushHistory();
        actions.setDrawing(true);
        const shape = createShape(tool as CanvasShape['type'], worldPt);
        activeShapeIdRef.current = shape.id;
        actions.addShape(shape);

        if (tool === 'pen' || tool === 'highlighter') {
          drawingPointsRef.current = [{ ...worldPt, pressure: e.pressure }];
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
          if (!shape.locked && isPointInRotatedShape(worldPt, shape)) {
            hitShape = shape;
            break;
          }
        }

        if (hitShape) {
          // Select (or add to selection with shift)
          if (e.shiftKey) {
            const wasSelected = state.selectedIds.includes(hitShape.id);
            const newIds = state.selectedIds.includes(hitShape.id)
              ? state.selectedIds.filter((id) => id !== hitShape!.id)
              : [...state.selectedIds, hitShape.id];
            actions.setSelected(newIds);
            if (wasSelected) return;
          } else if (!state.selectedIds.includes(hitShape.id)) {
            actions.setSelected([hitShape.id]);
          }

          // Start dragging
          actions.setDragging(true);
          dragStartRef.current = worldPt;
          svgRef.current?.setPointerCapture(e.pointerId);
        } else {
          // Empty-space drag creates a marquee selection. Shift keeps the current selection.
          if (!e.shiftKey) actions.setSelected([]);
          marqueeStartRef.current = worldPt;
          isMarqueeSelectingRef.current = true;
          marqueeAdditiveRef.current = e.shiftKey;
          setSelectionBox({ minX: worldPt.x, minY: worldPt.y, maxX: worldPt.x, maxY: worldPt.y });
          svgRef.current?.setPointerCapture(e.pointerId);
        }
        return;
      }
    },
    [state, actions, engine, getWorldPoint, createShape, onChanged]
  );

  // ── Pointer Move ───────────────────────────────────────────
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') {
        touchPointsRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const points = Array.from(touchPointsRef.current.values()).slice(0, 2);
        if (points.length >= 2 && pinchRef.current) {
          const rect = getRect();
          const center = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
          const distance = Math.max(1, Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y));
          const zoomRatio = distance / pinchRef.current.distance;
          const nextZoom = Math.max(0.1, Math.min(4, state.camera.zoom * zoomRatio));
          const previousLocal = { x: pinchRef.current.center.x - rect.left, y: pinchRef.current.center.y - rect.top };
          const nextLocal = { x: center.x - rect.left, y: center.y - rect.top };
          actions.setCamera({
            zoom: nextZoom,
            x: nextLocal.x - ((previousLocal.x - state.camera.x) / state.camera.zoom) * nextZoom,
            y: nextLocal.y - ((previousLocal.y - state.camera.y) / state.camera.zoom) * nextZoom,
          });
          pinchRef.current = { center, distance };
        } else if (points.length === 1 && panStartRef.current) {
          actions.setCamera({
            ...state.camera,
            x: panStartRef.current.camX + e.clientX - panStartRef.current.mouseX,
            y: panStartRef.current.camY + e.clientY - panStartRef.current.mouseY,
          });
        }
        return;
      }

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
      setDebugPointer(worldPt);
      const hovered = Object.values(state.shapes).sort((a, b) => b.zIndex - a.zIndex).find((shape) => !shape.locked && isPointInRotatedShape(worldPt, shape));
      actions.setHovered(hovered?.id ?? null);

      if (isMarqueeSelectingRef.current && marqueeStartRef.current) {
        const start = marqueeStartRef.current;
        setSelectionBox({
          minX: Math.min(start.x, worldPt.x),
          minY: Math.min(start.y, worldPt.y),
          maxX: Math.max(start.x, worldPt.x),
          maxY: Math.max(start.y, worldPt.y),
        });
        return;
      }

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

        if (tool === 'pen' || tool === 'highlighter') {
          drawingPointsRef.current.push({ ...worldPt, pressure: e.pressure });
          if (drawFrameRef.current === null) {
            drawFrameRef.current = requestAnimationFrame(() => {
              drawFrameRef.current = null;
              const points = [...drawingPointsRef.current];
              actions.updateShape(shapeId, { points, pathData: pointsToRawPath(points) } as Partial<PenShape>);
            });
          }
        } else if (dragStartRef.current) {
          // Rectangle, ellipse, line, arrow: update width/height from drag delta
          const dx = worldPt.x - dragStartRef.current.x;
          const dy = worldPt.y - dragStartRef.current.y;

          if (['rectangle', 'ellipse', 'diamond', 'triangle', 'star', 'hexagon', 'octagon', 'cloud', 'parallelogram', 'trapezoid', 'cylinder', 'callout', 'frame', 'video', 'bookmark', 'embed'].includes(tool)) {
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
              ...(tool === 'arrow' ? { start: dragStartRef.current, end: worldPt } : {}),
            });
          }
        }
        return;
      }

      // Dragging selected shapes
      if (state.isDragging && dragStartRef.current && state.selectedIds.length > 0) {
        const dx = worldPt.x - dragStartRef.current.x;
        const dy = worldPt.y - dragStartRef.current.y;
        actions.moveShapesWithSnapping(state.selectedIds, dx, dy);
        dragStartRef.current = worldPt;
        return;
      }

      // Resizing & Rotating
      if ((state.isResizing || state.isRotating) && resizeStartRef.current) {
        const { handle, startMouse, originalShapes, startAngle } = resizeStartRef.current;
        const shiftKey = e.shiftKey;
        const altKey = e.altKey;
        const dx = worldPt.x - startMouse.x;
        const dy = worldPt.y - startMouse.y;

        const rootId = state.selectedIds.length === 1 ? state.selectedIds[0] : null;
        const root = rootId ? originalShapes[rootId] : null;
        if (root && (root.type === 'frame' || root.meta?.isGroup === true) && handle !== 'rotation') {
          let rootX = root.x;
          let rootY = root.y;
          let rootW = root.width;
          let rootH = root.height;
          if (handle.includes('e')) rootW = root.width + dx;
          if (handle.includes('w')) { rootX = root.x + dx; rootW = root.width - dx; }
          if (handle.includes('s')) rootH = root.height + dy;
          if (handle.includes('n')) { rootY = root.y + dy; rootH = root.height - dy; }
          if (shiftKey && root.width && root.height) {
            const ratio = Math.abs(root.width / root.height);
            if (handle.includes('e') || handle.includes('w')) rootH = Math.max(5, Math.abs(rootW) / ratio);
            else if (handle.includes('n') || handle.includes('s')) rootW = Math.max(5, Math.abs(rootH) * ratio);
          }
          if (altKey) {
            const cx = root.x + root.width / 2;
            const cy = root.y + root.height / 2;
            rootX = cx - rootW / 2;
            rootY = cy - rootH / 2;
          }
          rootW = Math.max(5, rootW);
          rootH = Math.max(5, rootH);
          const scaleX = root.width ? rootW / root.width : 1;
          const scaleY = root.height ? rootH / root.height : 1;
          actions.updateShape(root.id, resizeShapePatch(root, rootX, rootY, rootW, rootH));
          for (const [id, child] of Object.entries(originalShapes)) {
            if (id === root.id) continue;
            actions.updateShape(id, resizeShapePatch(child,
              rootX + (child.x - root.x) * scaleX,
              rootY + (child.y - root.y) * scaleY,
              Math.max(1, child.width * Math.abs(scaleX)),
              Math.max(1, child.height * Math.abs(scaleY))));
          }
          return;
        }

        for (const id of engine.getHierarchyIds(state.selectedIds)) {
          const orig = originalShapes[id];
          if (!orig) continue;

          if (handle === 'rotation') {
             const allBounds = getSelectionBounds(Object.values(originalShapes));
             const center = allBounds ? { x: (allBounds.minX + allBounds.maxX) / 2, y: (allBounds.minY + allBounds.maxY) / 2 } : { x: orig.x + orig.width / 2, y: orig.y + orig.height / 2 };
             let delta = Math.atan2(worldPt.y - center.y, worldPt.x - center.x) - startAngle;
             if (shiftKey) delta = Math.round((delta * 180 / Math.PI) / 15) * 15 * Math.PI / 180;
             const shapeCenter = { x: orig.x + orig.width / 2, y: orig.y + orig.height / 2 };
             const nextCenter = rotatePoint(shapeCenter, center, delta * 180 / Math.PI);
             const rotationPatch = { x: nextCenter.x - orig.width / 2, y: nextCenter.y - orig.height / 2, rotation: orig.rotation + delta * 180 / Math.PI } as Partial<CanvasShape> & { start?: Point; end?: Point };
             if (orig.type === 'arrow') {
               const arrow = orig;
               rotationPatch.start = rotatePoint(arrow.start ?? { x: orig.x, y: orig.y }, center, delta * 180 / Math.PI);
               rotationPatch.end = rotatePoint(arrow.end ?? { x: orig.x + orig.width, y: orig.y + orig.height }, center, delta * 180 / Math.PI);
             }
             actions.updateShape(id, rotationPatch as Partial<CanvasShape>);
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

          if (shiftKey && orig.width !== 0 && orig.height !== 0) {
            const ratio = Math.abs(orig.width / orig.height);
            if (handle.includes('e') || handle.includes('w')) newH = Math.max(5, Math.abs(newW) / ratio) * (orig.height < 0 ? -1 : 1);
            else if (handle.includes('n') || handle.includes('s')) newW = Math.max(5, Math.abs(newH) * ratio) * (orig.width < 0 ? -1 : 1);
          }

          if (altKey) {
            const cx = orig.x + orig.width / 2;
            const cy = orig.y + orig.height / 2;
            newX = cx - newW / 2;
            newY = cy - newH / 2;
          }

          // Enforce minimum size
          if (newW < 5) newW = 5;
          if (newH < 5) newH = 5;

          actions.updateShape(id, resizeShapePatch(orig, newX, newY, newW, newH));
        }
        return;
      }
    },
    [state, actions, getWorldPoint, onPointerMoveWorld]
  );

  // ── Pointer Up ─────────────────────────────────────────────
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (e.pointerType === 'touch') {
        touchPointsRef.current.delete(e.pointerId);
        if (touchPointsRef.current.size < 2) pinchRef.current = null;
        if (touchPointsRef.current.size === 0) {
          actions.setPanning(false);
          panStartRef.current = null;
        }
        return;
      }

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

      // Finish marquee selection. Dragging right selects fully contained shapes;
      // dragging left selects anything the marquee crosses, matching familiar
      // canvas conventions from Excalidraw and other whiteboard tools.
      if (isMarqueeSelectingRef.current) {
        const start = marqueeStartRef.current;
        if (start) {
          const end = getWorldPoint(e);
          const box = {
            minX: Math.min(start.x, end.x),
            minY: Math.min(start.y, end.y),
            maxX: Math.max(start.x, end.x),
            maxY: Math.max(start.y, end.y),
          };
          const isCrossingSelection = end.x < start.x;
          const selectedInBox = Object.values(state.shapes)
            .filter((shape) => {
              if (shape.locked) return false;
              const bounds = getShapeBounds(shape);
              return isCrossingSelection
                ? aabbOverlap(bounds, box)
                : bounds.minX >= box.minX && bounds.maxX <= box.maxX && bounds.minY >= box.minY && bounds.maxY <= box.maxY;
            })
            .map((shape) => shape.id);
          actions.setSelected(marqueeAdditiveRef.current
            ? Array.from(new Set([...state.selectedIds, ...selectedInBox]))
            : selectedInBox);
        }
        isMarqueeSelectingRef.current = false;
        marqueeStartRef.current = null;
        marqueeAdditiveRef.current = false;
        setSelectionBox(null);
        if (svgRef.current?.hasPointerCapture(e.pointerId)) {
          svgRef.current.releasePointerCapture(e.pointerId);
        }
        return;
      }

      // Finish drawing
      if (state.isDrawing && activeShapeIdRef.current) {
        const shapeId = activeShapeIdRef.current;
        const tool = state.activeTool;
        const shape = state.shapes[shapeId];

        if (drawFrameRef.current !== null) {
          cancelAnimationFrame(drawFrameRef.current);
          drawFrameRef.current = null;
        }

        if ((tool === 'pen' || tool === 'highlighter') && drawingPointsRef.current.length > 1) {
          // Simplify and smooth the path
          const simplified = simplifyPath(drawingPointsRef.current, 1.5);
          const pathData = pointsToSmoothPath(simplified);
          actions.updateShape(shapeId, {
            points: simplified,
            pathData,
          } as Partial<PenShape>);
        }

        if (tool === 'arrow' && shape) {
          const arrow = shape as CanvasShape & { start?: Point; end?: Point };
          const releasePoint = getWorldPoint(e);
          const endpoints = [
            { terminal: 'start' as const, point: dragStartRef.current ?? arrow.start ?? { x: arrow.x, y: arrow.y } },
            { terminal: 'end' as const, point: tool === 'arrow' ? releasePoint : arrow.end ?? { x: arrow.x + arrow.width, y: arrow.y + arrow.height } },
          ];
          endpoints.forEach(({ terminal, point }) => {
            const target = Object.values(state.shapes)
              .filter((candidate) => candidate.id !== shapeId && candidate.type !== 'arrow' && !candidate.locked)
              .map((candidate) => {
                const bounds = getShapeBounds(candidate);
                const points = getConnectionPoints(candidate);
                const nearest = points.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y))[0];
                return { candidate, distance: nearest ? Math.hypot(nearest.x - point.x, nearest.y - point.y) : Infinity, bounds, anchor: nearest ?? { x: candidate.x, y: candidate.y } };
              })
              .sort((a, b) => a.distance - b.distance)[0];
            if (!target || target.distance > 18) return;
            const normalizedAnchor = {
              x: Math.max(0, Math.min(1, (target.anchor.x - target.bounds.minX) / Math.max(1, target.bounds.maxX - target.bounds.minX))),
              y: Math.max(0, Math.min(1, (target.anchor.y - target.bounds.minY) / Math.max(1, target.bounds.maxY - target.bounds.minY))),
            };
            actions.createBinding({
              id: `binding:${shapeId}:${terminal}`,
              type: 'arrow',
              fromId: shapeId,
              toId: target.candidate.id,
              terminal,
              normalizedAnchor,
            });
          });
        }

        // Remove zero-size shapes (accidental clicks)
        const staysInDrawingMode = tool === 'pen' || tool === 'highlighter';
        const isAccidentalClick = shape && !staysInDrawingMode && Math.abs(shape.width) < 2 && Math.abs(shape.height) < 2;
        if (isAccidentalClick) {
          actions.deleteShapes([shapeId]);
          actions.setTool('select');
        } else if (shape) {
          // Geometric tools are one-shot. Pen and Highlighter stay active for
          // continuous strokes until the user explicitly selects another tool.
          actions.setSelected([shapeId]);
          if (!staysInDrawingMode) actions.setTool('select');
          if (tool === 'bookmark' || tool === 'embed') {
            setUrlEditor({ shapeId, type: tool });
            setUrlDraft('');
          }
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
    [state, actions, getWorldPoint, onChanged]
  );

  // ── Shape Pointer Down (for selection) ─────────────────────
  const handleShapePointerDown = useCallback(
    (e: React.PointerEvent, shapeId: string) => {
      if (state.activeTool !== 'select') return;
      if (state.shapes[shapeId]?.locked) return;

      e.stopPropagation();
      const worldPt = getWorldPoint(e);

      if (e.shiftKey) {
        const wasSelected = state.selectedIds.includes(shapeId);
        const newIds = state.selectedIds.includes(shapeId)
          ? state.selectedIds.filter((id) => id !== shapeId)
          : [...state.selectedIds, shapeId];
        actions.setSelected(newIds);
        if (wasSelected) return;
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
      for (const id of engine.getHierarchyIds(state.selectedIds)) {
        if (state.shapes[id]) {
          originalShapes[id] = { ...state.shapes[id] };
        }
      }

      const originalBounds = getSelectionBounds(Object.values(originalShapes));
      const rotationCenter = originalBounds ? { x: (originalBounds.minX + originalBounds.maxX) / 2, y: (originalBounds.minY + originalBounds.maxY) / 2 } : worldPt;

      resizeStartRef.current = {
        handle,
        startMouse: worldPt,
        originalShapes,
        shiftKey: e.shiftKey,
        altKey: e.altKey,
        startAngle: Math.atan2(worldPt.y - rotationCenter.y, worldPt.x - rotationCenter.x),
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
        if (!shape.locked && shape.type === 'text' && isPointInRotatedShape(worldPt, shape)) {
          setEditingTextId(shape.id);
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
      const richText = htmlToRichText(textInputRef.current?.innerHTML ?? '');
      const text = richTextToPlainText(richText);
      if (text.trim()) {
        const measuredHeight = textInputRef.current ? textInputRef.current.scrollHeight / state.camera.zoom : undefined;
        actions.updateShape(editingTextId, { text, richText, ...(measuredHeight ? { height: Math.max(measuredHeight, 30) } : {}) } as Partial<TextShape>);
      } else {
        // Delete empty text shapes
        actions.deleteShapes([editingTextId]);
      }
      setEditingTextId(null);
      setShowLinkEditor(false);
      setLinkDraft('');
      onChanged?.();
    }
  }, [editingTextId, actions, onChanged, state.camera.zoom]);

  const applyTextLink = useCallback(() => {
    const input = linkDraft.trim();
    const selection = window.getSelection();
    if (textSelectionRef.current && selection && textInputRef.current) {
      selection.removeAllRanges();
      selection.addRange(textSelectionRef.current);
      textInputRef.current.focus();
    }
    if (input) {
      const href = /^(https?:|mailto:|tel:)/i.test(input) ? input : `https://${input}`;
      document.execCommand('createLink', false, href);
    } else {
      document.execCommand('unlink', false);
    }
    setShowLinkEditor(false);
    setLinkDraft('');
    textInputRef.current?.focus();
  }, [linkDraft]);

  const commitUrlAsset = useCallback(() => {
    if (!urlEditor) return;
    const raw = urlDraft.trim();
    if (!raw) {
      actions.deleteShapes([urlEditor.shapeId]);
      setUrlEditor(null);
      setUrlDraft('');
      onChanged?.();
      return;
    }
    const src = /^(https?:|mailto:)/i.test(raw) ? raw : `https://${raw}`;
    const assetId = `asset:${generateId()}`;
    let name = src;
    try { name = new URL(src).hostname; } catch {}
    engine.run(() => {
      actions.createAsset({ id: assetId, type: urlEditor.type, src, name });
      actions.updateShape(urlEditor.shapeId, { assetId } as Partial<CanvasShape>);
    });
    setUrlEditor(null);
    setUrlDraft('');
    onChanged?.();
  }, [actions, engine, onChanged, urlDraft, urlEditor]);

  // ── Get sorted shapes ──────────────────────────────────────
  const sortedShapes = Object.values(state.shapes).sort((a, b) => a.zIndex - b.zIndex);
  const viewportBounds = getViewportBounds(state.camera, getRect());
  const visibleShapes = sortedShapes.filter((shape) => aabbOverlap(getShapeBounds(shape), viewportBounds));
  const contentBounds = useMemo(() => getSelectionBounds(Object.values(state.shapes)), [state.shapes]);
  const contentIsOutsideViewport = !!contentBounds && !aabbOverlap(contentBounds, viewportBounds);
  const selectedShapes = state.selectedIds.map((id) => state.shapes[id]).filter(Boolean);
  const currentPage = state.pages.find((page) => page.id === state.currentPageId);
  const currentPagePosition = state.pages.findIndex((page) => page.id === state.currentPageId);

  const navigateToMinimapPoint = useCallback((point: Point) => {
    const rect = getRect();
    if (!rect.width || !rect.height) return;
    actions.setCamera({
      ...state.camera,
      x: rect.width / 2 - point.x * state.camera.zoom,
      y: rect.height / 2 - point.y * state.camera.zoom,
    });
  }, [actions, getRect, state.camera]);

  useEffect(() => {
    setPageNameDraft(currentPage?.name ?? '');
  }, [currentPage?.id, currentPage?.name]);

  const duplicateShapes = useCallback((ids: string[]) => {
    const clones = ids.map((id, index) => {
      const shape = state.shapes[id];
      if (!shape) return null;
      return {
        ...structuredClone(shape),
        id: generateId(),
        x: shape.x + 24,
        y: shape.y + 24,
        zIndex: Object.keys(state.shapes).length + index,
        pageId: state.currentPageId,
        parentId: state.currentPageId,
      } as CanvasShape;
    }).filter((shape): shape is CanvasShape => !!shape);
    if (clones.length === 0) return;
    engine.pushHistory();
    clones.forEach((shape) => actions.addShape(shape));
    actions.setSelected(clones.map((shape) => shape.id));
    onChanged?.();
    setContextMenu(null);
  }, [actions, engine, onChanged, state.currentPageId, state.shapes]);

  const groupSelection = useCallback((ids: string[]) => {
    const shapes = ids.map((id) => state.shapes[id]).filter(Boolean);
    const bounds = getSelectionBounds(shapes);
    if (shapes.length < 2 || !bounds) return;
    engine.pushHistory();
    actions.group(ids, generateId(), { x: bounds.minX, y: bounds.minY, width: bounds.maxX - bounds.minX, height: bounds.maxY - bounds.minY });
    onChanged?.();
    setContextMenu(null);
  }, [actions, engine, onChanged, state.shapes]);

  const handleContextMenu = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    e.preventDefault();
    const worldPt = screenToWorld(e.clientX, e.clientY, state.camera, getRect());
    const hitShape = Object.values(state.shapes)
      .sort((a, b) => b.zIndex - a.zIndex)
      .find((shape) => !shape.locked && isPointInRotatedShape(worldPt, shape));
    const shapeIds = hitShape
      ? state.selectedIds.includes(hitShape.id) ? state.selectedIds : [hitShape.id]
      : state.selectedIds;
    if (hitShape && !state.selectedIds.includes(hitShape.id)) actions.setSelected([hitShape.id]);
    const rect = getRect();
    setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top, shapeIds });
  }, [actions, getRect, state.camera, state.selectedIds, state.shapes]);

  // Derive active selection style if a single shape is selected
  const activeSelectionStyle = selectedShapes.length === 1
    ? {
        color: selectedShapes[0].color,
        strokeWidth: selectedShapes[0].strokeWidth,
        strokeStyle: selectedShapes[0].strokeStyle || 'solid',
        fill: selectedShapes[0].fill || 'transparent',
        fillStyle: selectedShapes[0].fillStyle || 'none',
        opacity: selectedShapes[0].opacity ?? 1,
        fontSize: selectedShapes[0].type === 'text' || selectedShapes[0].type === 'sticky-note'
          ? selectedShapes[0].fontSize
          : state.toolStyle.fontSize,
        borderRadius: selectedShapes[0].type === 'rectangle'
          ? selectedShapes[0].borderRadius
          : 0,
        fontWeight: selectedShapes[0].type === 'text' ? selectedShapes[0].fontWeight : state.toolStyle.fontWeight,
        fontStyle: selectedShapes[0].type === 'text' ? selectedShapes[0].fontStyle : state.toolStyle.fontStyle,
        textAlign: selectedShapes[0].type === 'text' ? selectedShapes[0].textAlign : state.toolStyle.textAlign,
        verticalAlign: selectedShapes[0].type === 'text' ? selectedShapes[0].verticalAlign : state.toolStyle.verticalAlign,
        fontFamily: selectedShapes[0].type === 'text' ? selectedShapes[0].fontFamily : state.toolStyle.fontFamily,
        arrowHead: selectedShapes[0].type === 'arrow' ? selectedShapes[0].arrowHead : state.toolStyle.arrowHead,
        arrowStyle: selectedShapes[0].type === 'arrow' ? selectedShapes[0].arrowStyle : state.toolStyle.arrowStyle,
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
      onDragOver={(event) => event.preventDefault()}
      onDrop={handleCanvasDrop}
      onPaste={handleCanvasPaste}
    >
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 pointer-events-auto">
        <label className="sr-only" htmlFor="canvas-page">Current page</label>
        <select
          id="canvas-page"
          value={state.currentPageId}
          onChange={(event) => actions.switchPage(event.target.value)}
          className="h-8 max-w-[150px] rounded-lg border border-border/70 bg-surface/90 px-2 text-xs font-medium text-foreground outline-none backdrop-blur-xl focus:border-accent-blue"
          title="Current page"
        >
          {state.pages.map((page) => <option key={page.id} value={page.id}>{page.name}</option>)}
        </select>
        <button
          type="button"
          onClick={() => actions.createPage()}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface/90 text-muted backdrop-blur-xl transition-colors hover:bg-surface-hover hover:text-foreground"
          title="Create page"
          aria-label="Create page"
        >
          <Plus size={14} />
        </button>
        {state.pages.length > 1 && (
          <button
            type="button"
            onClick={() => actions.deletePage(state.currentPageId)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface/90 text-muted backdrop-blur-xl transition-colors hover:bg-red-500/10 hover:text-red-600"
            title="Delete current page"
            aria-label="Delete current page"
          >
            <Trash2 size={14} />
          </button>
        )}
        <button
          type="button"
          onClick={() => setPageControlsOpen((open) => !open)}
          className={`flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-surface/90 text-muted backdrop-blur-xl transition-colors hover:bg-surface-hover hover:text-foreground ${pageControlsOpen ? 'bg-surface-hover text-foreground' : ''}`}
          title="Page management"
          aria-label="Page management"
          aria-expanded={pageControlsOpen}
        >
          <MoreHorizontal size={14} />
        </button>
        <button
          type="button"
          onClick={() => actions.setPreferences({ snapToGrid: !state.preferences.snapToGrid })}
          className={`h-8 rounded-lg border px-2.5 text-xs font-medium backdrop-blur-xl transition-colors ${state.preferences.snapToGrid ? 'border-accent-blue/50 bg-accent-blue/10 text-accent-blue' : 'border-border/70 bg-surface/90 text-muted hover:text-foreground'}`}
          aria-pressed={state.preferences.snapToGrid}
          title="Toggle grid snapping"
        >
          Snap {state.preferences.snapToGrid ? 'on' : 'off'}
        </button>
        {selectedShapes.length > 1 && (
          <div className="hidden items-center gap-1 rounded-lg border border-border/70 bg-surface/90 p-1 backdrop-blur-xl sm:flex">
            {(['left', 'center', 'right', 'top', 'middle', 'bottom'] as const).map((alignment) => (
              <button
                key={alignment}
                type="button"
                onClick={() => actions.alignShapes(state.selectedIds, alignment)}
                className="rounded px-1.5 py-1 text-[10px] font-semibold capitalize text-muted hover:bg-surface-hover hover:text-foreground"
                title={`Align ${alignment}`}
              >
                {alignment === 'middle' ? 'mid' : alignment}
              </button>
            ))}
            <button type="button" onClick={() => actions.distributeShapes(state.selectedIds, 'horizontal')} className="rounded px-1.5 py-1 text-[10px] font-semibold text-muted hover:bg-surface-hover hover:text-foreground" title="Distribute horizontally">H</button>
            <button type="button" onClick={() => actions.distributeShapes(state.selectedIds, 'vertical')} className="rounded px-1.5 py-1 text-[10px] font-semibold text-muted hover:bg-surface-hover hover:text-foreground" title="Distribute vertically">V</button>
          </div>
        )}
      </div>

      {pageControlsOpen && currentPage && (
        <div className="absolute left-4 top-14 z-40 w-64 rounded-xl border border-border/80 bg-surface/95 p-3 shadow-xl backdrop-blur-xl" onPointerDown={(event) => event.stopPropagation()}>
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">Page</div>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              const name = pageNameDraft.trim();
              if (name) actions.renamePage(currentPage.id, name);
            }}
          >
            <input
              value={pageNameDraft}
              onChange={(event) => setPageNameDraft(event.target.value)}
              aria-label="Page name"
              className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent-blue"
            />
            <button type="submit" className="rounded-md bg-accent-blue px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-105">Rename</button>
          </form>
          <div className="mt-3 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => { actions.duplicatePage(currentPage.id); setPageControlsOpen(false); }} className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground"><Copy size={12} /> Duplicate</button>
            <button type="button" onClick={() => { actions.createPage(); setPageControlsOpen(false); }} className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground"><Plus size={12} /> New page</button>
            <button type="button" disabled={currentPagePosition <= 0} onClick={() => actions.reorderPage(currentPage.id, 'up')} className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40"><ChevronUp size={12} /> Move up</button>
            <button type="button" disabled={currentPagePosition < 0 || currentPagePosition >= state.pages.length - 1} onClick={() => actions.reorderPage(currentPage.id, 'down')} className="flex items-center justify-center gap-1.5 rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground disabled:opacity-40"><ChevronDown size={12} /> Move down</button>
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="absolute z-50 w-44 rounded-xl border border-border/80 bg-surface/95 p-1.5 shadow-xl backdrop-blur-xl"
          style={{ left: Math.min(contextMenu.x, Math.max(8, (getRect().width || 320) - 190)), top: Math.min(contextMenu.y, Math.max(8, (getRect().height || 240) - 220)) }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button type="button" onClick={() => duplicateShapes(contextMenu.shapeIds)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover"><Copy size={13} /> Duplicate</button>
          {contextMenu.shapeIds.length > 1 && <button type="button" onClick={() => groupSelection(contextMenu.shapeIds)} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover">Group</button>}
          {contextMenu.shapeIds.length === 1 && state.shapes[contextMenu.shapeIds[0]]?.meta?.isGroup === true && <button type="button" onClick={() => { actions.ungroup(contextMenu.shapeIds[0]); setContextMenu(null); onChanged?.(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover">Ungroup</button>}
          {contextMenu.shapeIds.some((id) => state.shapes[id]?.type === 'arrow') && (
            <button
              type="button"
              onClick={() => {
                contextMenu.shapeIds.forEach((id) => { if (state.shapes[id]?.type === 'arrow') actions.updateShape(id, { arrowStyle: (state.shapes[id] as CanvasShape & { arrowStyle?: string }).arrowStyle === 'elbow' ? 'straight' : 'elbow' } as Partial<CanvasShape>); });
                setContextMenu(null);
                onChanged?.();
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover"
            >↪ Toggle elbow route</button>
          )}
          <button type="button" onClick={() => { actions.bringToFront(contextMenu.shapeIds); setContextMenu(null); onChanged?.(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover"><ChevronUp size={13} /> Bring to front</button>
          <button type="button" onClick={() => { actions.sendToBack(contextMenu.shapeIds); setContextMenu(null); onChanged?.(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover"><ChevronDown size={13} /> Send to back</button>
          <button type="button" onClick={() => { const locked = contextMenu.shapeIds.every((id) => state.shapes[id]?.locked); actions.lockShapes(contextMenu.shapeIds, !locked); setContextMenu(null); onChanged?.(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-foreground hover:bg-surface-hover">{contextMenu.shapeIds.every((id) => state.shapes[id]?.locked) ? <Unlock size={13} /> : <Lock size={13} />} {contextMenu.shapeIds.every((id) => state.shapes[id]?.locked) ? 'Unlock' : 'Lock'}</button>
          <div className="my-1 border-t border-border/60" />
          <button type="button" onClick={() => { actions.deleteShapes(contextMenu.shapeIds); setContextMenu(null); onChanged?.(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-xs text-red-600 hover:bg-red-500/10"><Trash2 size={13} /> Delete</button>
        </div>
      )}

      {/* Grid is a real preference, not a decorative always-on layer. */}
      {state.preferences.showGrid && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          style={{ opacity: 0.4 }}
          aria-hidden="true"
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
              <circle cx={1} cy={1} r={0.8} fill="var(--muted)" opacity={0.3} />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-small)" />
        </svg>
      )}

      {/* Main SVG canvas */}
      <svg
        ref={svgRef}
        className="absolute inset-0 h-full w-full touch-none"
        role="application"
        aria-label="Infinite canvas editor"
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        <defs>
          <filter id="laser-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          {sortedShapes.filter((shape) => shape.type === 'frame' && (shape as CanvasShape & { clipContent?: boolean }).clipContent !== false).map((frame) => {
            const clipId = `canvas-frame-${frame.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
            return (
              <clipPath key={clipId} id={clipId}>
                <rect x={frame.x} y={frame.y} width={Math.max(1, Math.abs(frame.width))} height={Math.max(1, Math.abs(frame.height))} />
              </clipPath>
            );
          })}
        </defs>
        <g transform={getCameraTransform(state.camera)}>
          {/* Render all shapes */}
          {visibleShapes.map((shape) => {
            const clipFrames: CanvasShape[] = [];
            const seen = new Set<string>();
            let parentId = shape.parentId;
            while (parentId && !seen.has(parentId)) {
              seen.add(parentId);
              const parent = state.shapes[parentId];
              if (!parent) break;
              if (parent.type === 'frame' && (parent as CanvasShape & { clipContent?: boolean }).clipContent !== false) clipFrames.unshift(parent);
              parentId = parent.parentId;
            }
            const rendered = <ShapeRenderer shape={shape} assets={state.assets} isSelected={state.selectedIds.includes(shape.id)} onPointerDown={handleShapePointerDown} />;
            const clipped = clipFrames.reduce<React.ReactNode>((content, frame) => (
              <g clipPath={`url(#canvas-frame-${frame.id.replace(/[^a-zA-Z0-9_-]/g, '_')})`}>{content}</g>
            ), rendered);
            return <React.Fragment key={shape.id}>{clipped}</React.Fragment>;
          })}

          {state.hoveredId && state.shapes[state.hoveredId] && (
            <rect
              x={getShapeBounds(state.shapes[state.hoveredId]).minX}
              y={getShapeBounds(state.shapes[state.hoveredId]).minY}
              width={Math.max(1, getShapeBounds(state.shapes[state.hoveredId]).maxX - getShapeBounds(state.shapes[state.hoveredId]).minX)}
              height={Math.max(1, getShapeBounds(state.shapes[state.hoveredId]).maxY - getShapeBounds(state.shapes[state.hoveredId]).minY)}
              fill="none"
              stroke="var(--accent-blue)"
              strokeWidth={1}
              strokeDasharray="3 3"
              opacity={0.55}
              pointerEvents="none"
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          )}

          {selectionBox && (
            <rect
              x={selectionBox.minX}
              y={selectionBox.minY}
              width={selectionBox.maxX - selectionBox.minX}
              height={selectionBox.maxY - selectionBox.minY}
              fill="var(--accent-blue)"
              fillOpacity={0.08}
              stroke="var(--accent-blue)"
              strokeWidth={1}
              strokeDasharray="6 4"
              pointerEvents="none"
              style={{ vectorEffect: 'non-scaling-stroke' }}
            />
          )}

          {/* Selection overlay */}
          {selectedShapes.length > 0 && state.activeTool === 'select' && !state.isDrawing && (
          <SelectionOverlay
            shapes={selectedShapes}
            zoom={state.camera.zoom}
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
            style={{ left: `clamp(8px, ${screenPt.x + 18}px, calc(100% - 272px))`, top: `clamp(8px, ${screenPt.y - 20}px, calc(100% - 180px))` }}
            className="absolute z-40 w-64 max-w-[calc(100%_-_16px)] rounded-2xl border border-border bg-surface/95 backdrop-blur p-3.5 shadow-2xl space-y-2 pointer-events-auto"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <CommentAvatar name={comment.userName} avatarUrl={comment.avatarUrl} />
                <span className="truncate text-xs font-semibold text-foreground">{comment.userName}</span>
              </div>
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
            style={{ left: `clamp(8px, ${screenPt.x + 18}px, calc(100% - 272px))`, top: `clamp(8px, ${screenPt.y - 20}px, calc(100% - 180px))` }}
            className="absolute z-40 w-64 max-w-[calc(100%_-_16px)] rounded-2xl border border-border bg-surface p-3 shadow-2xl space-y-2 pointer-events-auto"
          >
            {commentAuthor && (
              <div className="flex items-center gap-2 border-b border-border/60 pb-2">
                <CommentAvatar name={commentAuthor.name} avatarUrl={commentAuthor.avatarUrl} />
                <div className="min-w-0">
                  <p className="text-[10px] text-muted">Commenting as</p>
                  <p className="truncate text-xs font-semibold text-foreground">{commentAuthor.name}</p>
                </div>
              </div>
            )}
            <textarea
              autoFocus
              value={newCommentText}
              onChange={(e) => setNewCommentText(e.target.value)}
              onKeyDown={(e) => e.stopPropagation()}
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

      {urlEditor && state.shapes[urlEditor.shapeId] && (() => {
        const shape = state.shapes[urlEditor.shapeId];
        const screenPt = worldToScreen(shape.x, shape.y, state.camera);
        return (
          <form
            className="absolute z-40 flex w-72 items-center gap-1 rounded-lg border border-accent-blue/50 bg-surface p-1.5 shadow-lg pointer-events-auto"
            style={{ left: screenPt.x, top: screenPt.y - 42 }}
            onSubmit={(event) => { event.preventDefault(); commitUrlAsset(); }}
          >
            <input
              autoFocus
              value={urlDraft}
              onChange={(event) => setUrlDraft(event.target.value)}
              placeholder={urlEditor.type === 'bookmark' ? 'Paste a URL for this bookmark' : 'Paste an embed URL'}
              aria-label={urlEditor.type === 'bookmark' ? 'Bookmark URL' : 'Embed URL'}
              className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-accent-blue"
            />
            <button type="submit" className="rounded px-2 py-1.5 text-xs font-semibold text-accent-blue hover:bg-accent-blue/10">Save</button>
            <button type="button" onClick={() => { actions.deleteShapes([urlEditor.shapeId]); setUrlEditor(null); setUrlDraft(''); onChanged?.(); }} className="rounded px-2 py-1.5 text-xs text-muted hover:bg-surface-hover hover:text-foreground">Cancel</button>
          </form>
        );
      })()}

      {/* Text editing overlay (HTML on top of SVG) */}
      {editingTextId && state.shapes[editingTextId] && (
        <div
          className="absolute z-40 rounded-lg border border-accent-blue/50 bg-surface/95 shadow-lg"
          style={{
            left: worldToScreen(state.shapes[editingTextId].x, state.shapes[editingTextId].y, state.camera).x - 2,
            top: worldToScreen(state.shapes[editingTextId].x, state.shapes[editingTextId].y, state.camera).y - 42,
            width: Math.max(state.shapes[editingTextId].width * state.camera.zoom, 120),
            transform: state.shapes[editingTextId].rotation ? `rotate(${state.shapes[editingTextId].rotation}deg)` : undefined,
            transformOrigin: 'top left',
          }}
        >
          <div className="flex items-center gap-1 border-b border-border/60 px-1.5 py-1" onMouseDown={(event) => event.preventDefault()}>
            {[
              { label: 'B', command: 'bold', title: 'Bold' },
              { label: 'I', command: 'italic', title: 'Italic' },
              { label: 'H', command: 'hiliteColor', title: 'Highlight' },
              { label: '</>', command: 'formatBlock', title: 'Code' },
              { label: '•', command: 'insertUnorderedList', title: 'Bulleted list' },
              { label: '1.', command: 'insertOrderedList', title: 'Numbered list' },
            ].map((format) => (
              <button
                key={format.command}
                type="button"
                title={format.title}
                onMouseDown={(event) => {
                  event.preventDefault();
                  if (format.command === 'hiliteColor') document.execCommand('hiliteColor', false, '#f5d66b');
                  else if (format.command === 'formatBlock') document.execCommand('formatBlock', false, 'code');
                  else document.execCommand(format.command, false);
                  textInputRef.current?.focus();
                }}
                className="min-w-6 rounded px-1.5 py-0.5 text-[11px] font-semibold text-muted hover:bg-surface-hover hover:text-foreground"
              >
                {format.label}
              </button>
            ))}
            <button
              type="button"
              title="Add or edit link"
              onMouseDown={(event) => {
                event.preventDefault();
                const selection = window.getSelection();
                textSelectionRef.current = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
                setShowLinkEditor((value) => !value);
              }}
              className={`min-w-6 rounded px-1.5 py-0.5 text-[11px] font-semibold hover:bg-surface-hover hover:text-foreground ${showLinkEditor ? 'text-accent-blue' : 'text-muted'}`}
            >
              Link
            </button>
            <button type="button" onMouseDown={(event) => { event.preventDefault(); commitTextEdit(); }} className="ml-auto rounded px-2 py-0.5 text-[11px] font-semibold text-accent-blue hover:bg-accent-blue/10">Done</button>
          </div>
          {showLinkEditor && (
            <form
              className="flex items-center gap-1 border-b border-border/60 px-1.5 py-1"
              onSubmit={(event) => { event.preventDefault(); applyTextLink(); }}
            >
              <input
                autoFocus
                value={linkDraft}
                onChange={(event) => setLinkDraft(event.target.value)}
                placeholder="https://…"
                aria-label="Link URL"
                className="min-w-0 flex-1 rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground outline-none focus:border-accent-blue"
              />
              <button type="submit" className="rounded px-1.5 py-1 text-[11px] font-semibold text-accent-blue hover:bg-accent-blue/10">Apply</button>
            </form>
          )}
          <div
            ref={textInputRef}
            contentEditable
            suppressContentEditableWarning
            onBlur={(event) => {
              const nextFocus = event.relatedTarget as Node | null;
              if (nextFocus && event.currentTarget.parentElement?.contains(nextFocus)) return;
              setTimeout(commitTextEdit, 0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'Escape' || (event.key === 'Enter' && (event.metaKey || event.ctrlKey))) {
                event.preventDefault();
                commitTextEdit();
              }
            }}
            dangerouslySetInnerHTML={{ __html: richTextToHtml((state.shapes[editingTextId] as TextShape).richText ?? plainTextToRichText((state.shapes[editingTextId] as TextShape).text)) }}
            className="min-h-[30px] w-full bg-transparent px-1 py-0.5 text-foreground outline-none"
            style={{
              minHeight: Math.max(state.shapes[editingTextId].height * state.camera.zoom, 30),
              fontSize: ((state.shapes[editingTextId] as TextShape).fontSize || state.toolStyle.fontSize) * state.camera.zoom,
              fontFamily: (state.shapes[editingTextId] as TextShape).fontFamily || 'system-ui, sans-serif',
              color: state.shapes[editingTextId].color || state.toolStyle.color,
              lineHeight: 1.2,
            }}
          />
        </div>
      )}

      {/* Toolbar */}
      <CanvasToolbar
        activeTool={state.activeTool}
        toolStyle={activeSelectionStyle}
        onToolChange={actions.setTool}
        onStyleChange={(style) => {
          if (state.selectedIds.length > 0) {
            engine.pushHistory();
        for (const id of engine.getHierarchyIds(state.selectedIds)) {
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

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importMedia(file);
          event.target.value = '';
        }}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) importJSON(file);
          event.target.value = '';
        }}
      />

      {contentBounds && (
        <CanvasMiniMap
          shapes={sortedShapes}
          viewport={viewportBounds}
          onNavigate={navigateToMinimapPoint}
        />
      )}

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
          title="Fit all content to screen"
          aria-label="Fit all content to screen"
        >
          <Compass size={15} />
        </button>

        {contentIsOutsideViewport && (
          <button
            onClick={fitToScreen}
            className="flex items-center gap-1 rounded-lg bg-accent-blue/10 px-2 py-1.5 text-accent-blue transition-colors hover:bg-accent-blue/20"
            title="Find content"
            aria-label="Find content"
          >
            <LocateFixed size={15} />
            <span className="hidden text-[10px] font-semibold sm:inline">Find content</span>
          </button>
        )}

        <button
          onClick={() => actions.setPreferences({ showGrid: !state.preferences.showGrid })}
          className={`p-1.5 rounded-lg transition-colors ${state.preferences.showGrid ? 'text-accent-blue bg-accent-blue/10' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
          title={state.preferences.showGrid ? 'Hide grid' : 'Show grid'}
          aria-pressed={state.preferences.showGrid}
        >
          <Grid3X3 size={15} />
        </button>

        <button
          onClick={() => imageInputRef.current?.click()}
          className="p-1.5 text-muted hover:bg-surface-hover hover:text-foreground rounded-lg transition-colors"
          title="Import image"
        >
          <ImagePlus size={15} />
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
            <button onClick={exportToJSON} className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-hover rounded-lg font-medium transition-colors">
              Export as JSON
            </button>
            <button onClick={() => jsonInputRef.current?.click()} className="w-full text-left px-3 py-1.5 text-xs text-muted hover:text-foreground hover:bg-surface-hover rounded-lg font-medium transition-colors">
              Import JSON
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

        <button
          onClick={() => setDebugMode((value) => !value)}
          className={`p-1.5 rounded-lg transition-colors ${debugMode ? 'text-accent-blue bg-accent-blue/10' : 'text-muted hover:text-foreground hover:bg-surface-hover'}`}
          title="Toggle canvas debug information"
          aria-pressed={debugMode}
        >
          <span className="text-[10px] font-bold">DBG</span>
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

      {debugMode && (
        <div className="absolute bottom-20 left-4 z-30 w-64 rounded-lg border border-border/70 bg-surface/95 p-3 font-mono text-[10px] leading-5 text-muted shadow-lg">
          <div>tool: <span className="text-foreground">{state.activeTool}</span></div>
          <div>camera: <span className="text-foreground">{state.camera.x.toFixed(1)}, {state.camera.y.toFixed(1)} @ {state.camera.zoom.toFixed(2)}</span></div>
          <div>pointer: <span className="text-foreground">{debugPointer ? `${debugPointer.x.toFixed(1)}, ${debugPointer.y.toFixed(1)}` : '—'}</span></div>
          <div>selected: <span className="text-foreground">{state.selectedIds.length}</span></div>
          <div>shapes: <span className="text-foreground">{Object.keys(state.shapes).length}</span></div>
          <div>page: <span className="text-foreground">{state.currentPageId}</span></div>
        </div>
      )}

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

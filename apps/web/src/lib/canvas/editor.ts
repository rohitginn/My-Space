import {
  DEFAULT_CAMERA,
  DEFAULT_PAGE_ID,
  DEFAULT_PREFERENCES,
  migrateDocument,
  getPageShapes,
  serializeDocument,
} from './document';
import { getShapeBounds, rotatePoint, pointsToSmoothPath } from './math';
import { getSelectionBounds } from './geometry';
import type {
  Camera,
  CanvasDocument,
  CanvasShape,
  CommentPin,
  EditorSessionState,
  HandlePosition,
  Point,
  ToolStyle,
  ToolType,
  BindingRecord,
  PageRecord,
  UserPreferences,
  AssetRecord,
  PenShape,
  ArrowShape,
} from './types';

export interface EditorState extends EditorSessionState {
  shapes: Record<string, CanvasShape>;
  assets: Record<string, AssetRecord>;
  pages: PageRecord[];
  toolStyle: ToolStyle;
  isDrawing: boolean;
  isPanning: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  activeHandle: HandlePosition | null;
}

export interface RunOptions {
  history?: 'record' | 'ignore';
  ignoreShapeLock?: boolean;
}

const DEFAULT_TOOL_STYLE: ToolStyle = {
  color: '#287f74',
  strokeWidth: 2,
  strokeStyle: 'solid',
  fill: 'transparent',
  fillStyle: 'none',
  opacity: 1,
  fontSize: 16,
  borderRadius: 0,
  fontFamily: 'system-ui, sans-serif',
  verticalAlign: 'top',
};

const EMPTY_INTERACTION = {
  isDrawing: false,
  isPanning: false,
  isDragging: false,
  isResizing: false,
  isRotating: false,
  activeHandle: null as HandlePosition | null,
};

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function sameJSON(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pageIdFor(shape: CanvasShape, fallback: string): string {
  return shape.pageId ?? fallback;
}

export class CanvasEditor {
  private document: CanvasDocument;
  private session: EditorSessionState;
  private toolStyle: ToolStyle = { ...DEFAULT_TOOL_STYLE };
  private interaction = { ...EMPTY_INTERACTION };
  private listeners = new Set<() => void>();
  private history: CanvasDocument[] = [];
  private future: CanvasDocument[] = [];
  private transactionDepth = 0;
  private transactionBefore: CanvasDocument | null = null;
  private transactionOptions: RunOptions = {};
  private snapshot: EditorState;

  constructor(input?: CanvasDocument) {
    this.document = migrateDocument(input);
    this.session = {
      camera: { ...(this.document.pages?.[this.document.currentPageId ?? DEFAULT_PAGE_ID]?.camera ?? this.document.camera) },
      currentPageId: this.document.currentPageId ?? DEFAULT_PAGE_ID,
      selectedIds: [],
      activeTool: 'select',
      hoveredId: null,
      editingId: null,
      preferences: { ...DEFAULT_PREFERENCES },
    };
    this.snapshot = this.buildSnapshot();
  }

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private emit() {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }

  private buildSnapshot = (): EditorState => {
    const shapes = Object.fromEntries(getPageShapes(this.document, this.session.currentPageId).map((shape) => [shape.id, shape]));
    return {
      ...this.session,
      shapes,
      assets: { ...(this.document.assets ?? {}) },
      pages: Object.values(this.document.pages ?? {}).sort((a, b) => a.index - b.index),
      toolStyle: { ...this.toolStyle },
      ...this.interaction,
    };
  };

  getSnapshot = (): EditorState => this.snapshot;

  getDocument = (): CanvasDocument => serializeDocument({
    ...this.document,
    camera: this.session.camera,
    currentPageId: this.session.currentPageId,
  });

  private pushSnapshot(snapshot: CanvasDocument) {
    const last = this.history[this.history.length - 1];
    if (!last || !sameJSON(last, snapshot)) this.history.push(clone(snapshot));
    if (this.history.length > 80) this.history.shift();
    this.future = [];
  }

  pushHistory = () => {
    this.pushSnapshot(this.getDocument());
  };

  run = (fn: () => void, options: RunOptions = {}) => {
    const isRoot = this.transactionDepth === 0;
    if (isRoot) {
      this.transactionBefore = this.getDocument();
      this.transactionOptions = options;
    }
    this.transactionDepth += 1;
    try {
      fn();
    } finally {
      this.transactionDepth -= 1;
      if (isRoot) {
        const before = this.transactionBefore;
        const after = this.getDocument();
        if (before && !sameJSON(before, after) && this.transactionOptions.history !== 'ignore') {
          this.pushSnapshot(before);
        }
        this.transactionBefore = null;
        this.transactionOptions = {};
        this.emit();
      }
    }
  };

  private mutate(fn: () => void) {
    if (this.transactionDepth > 0) {
      fn();
      return;
    }
    fn();
    this.emit();
  }

  private canEdit(shape: CanvasShape | undefined, ignoreShapeLock = false) {
    return !!shape && (!shape.locked || ignoreShapeLock);
  }

  private expandHierarchy(ids: string[]) {
    const expanded = new Set(ids);
    let changed = true;
    while (changed) {
      changed = false;
      Object.values(this.document.shapes).forEach((shape) => {
        if (shape.parentId && expanded.has(shape.parentId) && !expanded.has(shape.id)) {
          expanded.add(shape.id);
          changed = true;
        }
      });
    }
    return Array.from(expanded);
  }

  private replaceDocument(document: CanvasDocument) {
    this.document = migrateDocument(document);
    this.session.camera = { ...(this.document.pages?.[this.document.currentPageId ?? DEFAULT_PAGE_ID]?.camera ?? this.document.camera) };
    this.session.currentPageId = this.document.currentPageId ?? DEFAULT_PAGE_ID;
    this.session.selectedIds = [];
    this.emit();
  }

  loadDocument = (document: CanvasDocument) => {
    this.replaceDocument(document);
  };

  setCamera = (camera: Camera) => {
    this.session.camera = camera;
    this.document.camera = camera;
    const page = this.document.pages?.[this.session.currentPageId];
    if (page) this.document.pages![this.session.currentPageId] = { ...page, camera: { ...camera } };
    this.emit();
  };

  setTool = (tool: ToolType) => {
    this.session.activeTool = tool;
    if (tool !== 'select') this.session.selectedIds = [];
    this.emit();
  };

  setToolStyle = (style: Partial<ToolStyle>) => {
    this.toolStyle = { ...this.toolStyle, ...style };
    this.emit();
  };

  setComments = (comments: CommentPin[]) => {
    this.document.comments = clone(comments);
    this.emit();
  };

  setSelected = (ids: string[]) => {
    this.session.selectedIds = Array.from(new Set(ids)).filter((id) => !!this.document.shapes[id]);
    this.emit();
  };

  selectAll = () => this.setSelected(getPageShapes(this.document, this.session.currentPageId).filter((shape) => !shape.locked).map((shape) => shape.id));
  selectNone = () => this.setSelected([]);
  getShape = (id: string) => this.document.shapes[id];
  getSelectedShapes = () => this.session.selectedIds.map((id) => this.document.shapes[id]).filter(Boolean);
  getCurrentPageShapes = () => getPageShapes(this.document, this.session.currentPageId);
  getHierarchyIds = (ids: string[]) => this.expandHierarchy(ids);

  setHovered = (id: string | null) => {
    this.session.hoveredId = id;
    this.emit();
  };

  setEditing = (id: string | null) => {
    this.session.editingId = id;
    this.emit();
  };

  startEditing = (id: string) => {
    if (this.canEdit(this.document.shapes[id])) this.setEditing(id);
  };
  stopEditing = () => this.setEditing(null);

  zoomIn = () => this.setCamera({ ...this.session.camera, zoom: Math.min(10, this.session.camera.zoom * 1.15) });
  zoomOut = () => this.setCamera({ ...this.session.camera, zoom: Math.max(0.1, this.session.camera.zoom / 1.15) });
  resetZoom = () => this.setCamera({ ...this.session.camera, zoom: 1 });

  setInteraction = (key: keyof typeof EMPTY_INTERACTION, value: boolean, handle?: HandlePosition | null) => {
    this.interaction = {
      ...this.interaction,
      [key]: value,
      ...(key === 'isResizing' ? { activeHandle: value ? handle ?? null : null } : {}),
    };
    this.emit();
  };

  addShape = (shape: CanvasShape) => {
    const pageId = pageIdFor(shape, this.session.currentPageId);
    const zIndex = shape.zIndex ?? Object.keys(this.document.shapes).length;
    this.document.shapes[shape.id] = {
      ...shape,
      pageId,
      parentId: shape.parentId ?? pageId,
      zIndex,
      locked: shape.locked ?? false,
    } as CanvasShape;
    this.mutate(() => undefined);
  };

  createAsset = (asset: AssetRecord) => {
    this.document.assets = { ...(this.document.assets ?? {}), [asset.id]: asset };
    this.mutate(() => undefined);
  };

  deleteAsset = (assetId: string) => {
    const referenced = Object.values(this.document.shapes).some((shape) => 'assetId' in shape && shape.assetId === assetId);
    if (referenced) return;
    if (!this.document.assets?.[assetId]) return;
    this.run(() => {
      const assets = { ...(this.document.assets ?? {}) };
      delete assets[assetId];
      this.document.assets = assets;
    });
  };

  pruneUnusedAssets = () => {
    const referenced = new Set(Object.values(this.document.shapes).flatMap((shape) => 'assetId' in shape && shape.assetId ? [shape.assetId] : []));
    const assets = Object.fromEntries(Object.entries(this.document.assets ?? {}).filter(([id]) => referenced.has(id)));
    if (Object.keys(assets).length === Object.keys(this.document.assets ?? {}).length) return;
    this.run(() => { this.document.assets = assets; });
  };

  createShapes = (shapes: CanvasShape[]) => {
    this.run(() => shapes.forEach((shape) => this.addShape(shape)));
  };

  updateShape = (id: string, changes: Partial<CanvasShape>, options: RunOptions = {}) => {
    const shape = this.document.shapes[id];
    if (!this.canEdit(shape, options.ignoreShapeLock)) return;
    this.document.shapes[id] = { ...shape, ...changes } as CanvasShape;
    this.refreshBindingsForShape(id);
    this.mutate(() => undefined);
  };

  updateShapes = (changes: Array<{ id: string; changes: Partial<CanvasShape> }>, options: RunOptions = {}) => {
    this.run(() => changes.forEach(({ id, changes: patch }) => this.updateShape(id, patch, options)), options);
  };

  deleteShapes = (ids: string[], options: RunOptions = {}) => {
    const removable = this.expandHierarchy(ids).filter((id) => this.canEdit(this.document.shapes[id], options.ignoreShapeLock));
    if (removable.length === 0) return;
    removable.forEach((id) => delete this.document.shapes[id]);
    Object.keys(this.document.bindings ?? {}).forEach((bindingId) => {
      const binding = this.document.bindings?.[bindingId];
      if (binding && (removable.includes(binding.fromId) || removable.includes(binding.toId))) delete this.document.bindings?.[bindingId];
    });
    this.session.selectedIds = this.session.selectedIds.filter((id) => !removable.includes(id));
    this.pruneUnusedAssets();
    this.mutate(() => undefined);
  };

  moveShapes = (ids: string[], dx: number, dy: number) => {
    this.expandHierarchy(ids).forEach((id) => {
      const shape = this.document.shapes[id];
      if (!this.canEdit(shape)) return;
      if (shape.type === 'pen') {
        const pen = shape as PenShape;
        const points = pen.points.map((point) => ({ x: point.x + dx, y: point.y + dy }));
        this.document.shapes[id] = { ...pen, x: pen.x + dx, y: pen.y + dy, points, pathData: pointsToSmoothPath(points) };
      } else {
        this.document.shapes[id] = { ...shape, x: shape.x + dx, y: shape.y + dy } as CanvasShape;
      }
      this.refreshBindingsForShape(id);
    });
    this.mutate(() => undefined);
  };

  moveShapesWithSnapping = (ids: string[], dx: number, dy: number) => {
    const selected = ids.map((id) => this.document.shapes[id]).filter(Boolean);
    if (selected.length === 0) return;
    let nextDx = dx;
    let nextDy = dy;
    const grid = this.document.settings?.gridSize ?? 20;
    if (this.session.preferences.snapToGrid) {
      const anchor = selected[0];
      nextDx = Math.round((anchor.x + dx) / grid) * grid - anchor.x;
      nextDy = Math.round((anchor.y + dy) / grid) * grid - anchor.y;
    }
    if (this.session.preferences.snapToObjects) {
      const selectedIds = new Set(ids);
      const others = getPageShapes(this.document, this.session.currentPageId).filter((shape) => !selectedIds.has(shape.id));
      const selectionBounds = getSelectionBounds(selected);
      if (selectionBounds && others.length > 0) {
        const moved = { minX: selectionBounds.minX + nextDx, minY: selectionBounds.minY + nextDy, maxX: selectionBounds.maxX + nextDx, maxY: selectionBounds.maxY + nextDy };
        let bestX = Number.POSITIVE_INFINITY;
        let bestY = Number.POSITIVE_INFINITY;
        others.forEach((other) => {
          const target = getShapeBounds(other);
          [target.minX, target.maxX].forEach((x) => { bestX = Math.min(bestX, Math.abs(moved.minX - x), Math.abs(moved.maxX - x)); });
          [target.minY, target.maxY].forEach((y) => { bestY = Math.min(bestY, Math.abs(moved.minY - y), Math.abs(moved.maxY - y)); });
        });
        if (bestX <= 8) {
          const target = others.flatMap((other) => { const b = getShapeBounds(other); return [b.minX, b.maxX]; }).sort((a, b) => Math.abs(a - moved.minX) - Math.abs(b - moved.minX))[0];
          nextDx += Math.abs(moved.minX - target) < Math.abs(moved.maxX - target) ? target - moved.minX : target - moved.maxX;
        }
        if (bestY <= 8) {
          const target = others.flatMap((other) => { const b = getShapeBounds(other); return [b.minY, b.maxY]; }).sort((a, b) => Math.abs(a - moved.minY) - Math.abs(b - moved.minY))[0];
          nextDy += Math.abs(moved.minY - target) < Math.abs(moved.maxY - target) ? target - moved.minY : target - moved.maxY;
        }
      }
    }
    this.moveShapes(ids, nextDx, nextDy);
  };

  alignShapes = (ids: string[], alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => {
    const shapes = ids.map((id) => this.document.shapes[id]).filter(Boolean);
    if (shapes.length < 2) return;
    const bounds = getSelectionBounds(shapes);
    if (!bounds) return;
    this.run(() => shapes.forEach((shape) => {
      const box = getShapeBounds(shape);
      const x = alignment === 'left' ? bounds.minX : alignment === 'center' ? (bounds.minX + bounds.maxX - shape.width) / 2 : alignment === 'right' ? bounds.maxX - shape.width : shape.x;
      const y = alignment === 'top' ? bounds.minY : alignment === 'middle' ? (bounds.minY + bounds.maxY - shape.height) / 2 : alignment === 'bottom' ? bounds.maxY - shape.height : shape.y;
      this.updateShape(shape.id, { x: alignment === 'left' || alignment === 'center' || alignment === 'right' ? x : shape.x, y: alignment === 'top' || alignment === 'middle' || alignment === 'bottom' ? y : shape.y });
    }));
  };

  distributeShapes = (ids: string[], axis: 'horizontal' | 'vertical') => {
    const shapes = ids.map((id) => this.document.shapes[id]).filter(Boolean).sort((a, b) => axis === 'horizontal' ? a.x - b.x : a.y - b.y);
    if (shapes.length < 3) return;
    const first = shapes[0];
    const last = shapes[shapes.length - 1];
    const firstEdge = axis === 'horizontal' ? first.x : first.y;
    const lastEdge = axis === 'horizontal' ? last.x + last.width : last.y + last.height;
    const totalSize = shapes.reduce((sum, shape) => sum + (axis === 'horizontal' ? shape.width : shape.height), 0);
    const gap = (lastEdge - firstEdge - totalSize) / (shapes.length - 1);
    let cursor = firstEdge;
    this.run(() => shapes.forEach((shape) => {
      const next = axis === 'horizontal' ? { x: cursor, y: shape.y } : { x: shape.x, y: cursor };
      this.updateShape(shape.id, next);
      cursor += (axis === 'horizontal' ? shape.width : shape.height) + gap;
    }));
  };

  rotateShapesBy = (ids: string[], angle: number) => {
    const shapes = this.expandHierarchy(ids).map((id) => this.document.shapes[id]).filter(Boolean);
    if (shapes.length === 0) return;
    const bounds = shapes.reduce((acc, shape) => {
      const box = getShapeBounds(shape);
      return { minX: Math.min(acc.minX, box.minX), minY: Math.min(acc.minY, box.minY), maxX: Math.max(acc.maxX, box.maxX), maxY: Math.max(acc.maxY, box.maxY) };
    }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    const center = { x: (bounds.minX + bounds.maxX) / 2, y: (bounds.minY + bounds.maxY) / 2 };
    this.run(() => shapes.forEach((shape) => {
      if (!this.canEdit(shape)) return;
      const shapeCenter = { x: shape.x + shape.width / 2, y: shape.y + shape.height / 2 };
      const next = rotatePoint(shapeCenter, center, angle);
      const nextShape = { ...shape, x: next.x - shape.width / 2, y: next.y - shape.height / 2, rotation: shape.rotation + angle } as CanvasShape & { start?: Point; end?: Point };
      if (shape.type === 'arrow') {
        const arrow = shape as ArrowShape;
        nextShape.start = rotatePoint(arrow.start ?? { x: shape.x, y: shape.y }, center, angle);
        nextShape.end = rotatePoint(arrow.end ?? { x: shape.x + shape.width, y: shape.y + shape.height }, center, angle);
      }
      this.document.shapes[shape.id] = nextShape;
    }));
  };

  bringToFront = (ids: string[]) => {
    this.run(() => {
      const max = Math.max(0, ...Object.values(this.document.shapes).map((shape) => shape.zIndex ?? 0));
      ids.forEach((id, index) => { if (this.document.shapes[id]) this.document.shapes[id] = { ...this.document.shapes[id], zIndex: max + index + 1 } as CanvasShape; });
    });
  };

  sendToBack = (ids: string[]) => {
    this.run(() => {
      const min = Math.min(0, ...Object.values(this.document.shapes).map((shape) => shape.zIndex ?? 0));
      ids.forEach((id, index) => { if (this.document.shapes[id]) this.document.shapes[id] = { ...this.document.shapes[id], zIndex: min - index - 1 } as CanvasShape; });
    });
  };

  lockShapes = (ids: string[], locked = true) => {
    this.run(() => ids.forEach((id) => {
      const shape = this.document.shapes[id];
      if (shape) this.document.shapes[id] = { ...shape, locked } as CanvasShape;
    }));
  };

  group = (ids: string[], groupId: string, bounds: { x: number; y: number; width: number; height: number }) => {
    this.run(() => {
      const pageId = this.session.currentPageId;
      this.addShape({ id: groupId, type: 'rectangle', x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, rotation: 0, color: 'transparent', strokeWidth: 1, strokeStyle: 'dashed', fill: 'transparent', fillStyle: 'none', opacity: 1, zIndex: -1, pageId, parentId: pageId, locked: false, borderRadius: 0, meta: { isGroup: true } } as CanvasShape);
      ids.forEach((id) => { if (this.document.shapes[id]) this.document.shapes[id] = { ...this.document.shapes[id], parentId: groupId } as CanvasShape; });
      this.session.selectedIds = [groupId];
    });
  };

  ungroup = (groupId: string) => {
    this.run(() => {
      Object.values(this.document.shapes).forEach((shape) => {
        if (shape.parentId === groupId) this.document.shapes[shape.id] = { ...shape, parentId: shape.pageId ?? this.session.currentPageId } as CanvasShape;
      });
      delete this.document.shapes[groupId];
      this.session.selectedIds = [];
    });
  };

  createBinding = (binding: BindingRecord) => {
    this.document.bindings = { ...(this.document.bindings ?? {}), [binding.id]: binding };
    this.refreshBindingsForShape(binding.toId);
    this.mutate(() => undefined);
  };

  private refreshBindingsForShape(shapeId: string) {
    const target = this.document.shapes[shapeId];
    if (!target) return;
    Object.values(this.document.bindings ?? {}).forEach((binding) => {
      if (binding.toId !== shapeId) return;
      const arrow = this.document.shapes[binding.fromId] as ArrowShape | undefined;
      if (!arrow || arrow.type !== 'arrow') return;
      const anchor = {
        x: target.x + target.width * binding.normalizedAnchor.x,
        y: target.y + target.height * binding.normalizedAnchor.y,
      };
      const start = arrow.start ?? { x: arrow.x, y: arrow.y };
      const end = arrow.end ?? { x: arrow.x + arrow.width, y: arrow.y + arrow.height };
      const nextStart = binding.terminal === 'start' ? anchor : start;
      const nextEnd = binding.terminal === 'end' ? anchor : end;
      this.document.shapes[arrow.id] = { ...arrow, x: Math.min(nextStart.x, nextEnd.x), y: Math.min(nextStart.y, nextEnd.y), width: nextEnd.x - nextStart.x, height: nextEnd.y - nextStart.y, start: nextStart, end: nextEnd };
    });
  }

  createPage = (page?: Partial<PageRecord>) => {
    this.run(() => {
      const id = page?.id ?? `page:${Date.now()}`;
      const index = page?.index ?? Math.max(-1, ...Object.values(this.document.pages ?? {}).map((record) => record.index)) + 1;
      this.document.pages = { ...(this.document.pages ?? {}), [id]: { id, name: page?.name ?? `Page ${index + 1}`, index, camera: { ...DEFAULT_CAMERA } } };
      this.document.currentPageId = id;
      this.session.currentPageId = id;
      this.session.camera = { ...DEFAULT_CAMERA };
      this.session.selectedIds = [];
    });
  };

  duplicatePage = (pageId: string) => {
    const source = this.document.pages?.[pageId];
    if (!source) return;
    this.run(() => {
      const id = `page:${Date.now()}:${Math.random().toString(36).slice(2, 7)}`;
      const nextIndex = source.index + 1;
      Object.values(this.document.pages ?? {}).forEach((page) => {
        if (page.index >= nextIndex) this.document.pages![page.id] = { ...page, index: page.index + 1 };
      });
      this.document.pages = {
        ...(this.document.pages ?? {}),
        [id]: { ...source, id, name: `${source.name} copy`, index: nextIndex },
      };
      const sourceShapes = Object.values(this.document.shapes).filter((shape) => (shape.pageId ?? DEFAULT_PAGE_ID) === pageId);
      const shapeIdMap = new Map<string, string>();
      sourceShapes.forEach((shape, index) => {
        shapeIdMap.set(shape.id, `${shape.id}:copy:${Date.now()}:${index}`);
      });
      sourceShapes.forEach((shape, index) => {
        const cloneShape = clone(shape);
        cloneShape.id = shapeIdMap.get(shape.id)!;
        cloneShape.pageId = id;
        const parentId = cloneShape.parentId;
        cloneShape.parentId = parentId === pageId ? id : parentId ? shapeIdMap.get(parentId) ?? parentId : parentId;
        this.document.shapes[cloneShape.id] = cloneShape;
      });
      Object.values(this.document.bindings ?? {}).forEach((binding) => {
        const fromId = shapeIdMap.get(binding.fromId);
        const toId = shapeIdMap.get(binding.toId);
        if (!fromId || !toId) return;
        const id = `${binding.id}:copy:${Date.now()}`;
        this.document.bindings![id] = { ...clone(binding), id, fromId, toId };
      });
      this.document.currentPageId = id;
      this.session.currentPageId = id;
      this.session.camera = { ...(this.document.pages[id].camera ?? DEFAULT_CAMERA) };
      this.session.selectedIds = [];
    });
  };

  reorderPage = (pageId: string, direction: 'up' | 'down') => {
    const pages = Object.values(this.document.pages ?? {}).sort((a, b) => a.index - b.index);
    const currentIndex = pages.findIndex((page) => page.id === pageId);
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= pages.length) return;
    this.run(() => {
      const current = pages[currentIndex];
      const target = pages[targetIndex];
      this.document.pages![current.id] = { ...current, index: target.index };
      this.document.pages![target.id] = { ...target, index: current.index };
    });
  };

  switchPage = (pageId: string) => {
    if (!this.document.pages?.[pageId]) return;
    this.session.currentPageId = pageId;
    this.document.currentPageId = pageId;
    this.session.camera = { ...(this.document.pages[pageId].camera ?? this.document.camera ?? DEFAULT_CAMERA) };
    this.session.selectedIds = [];
    this.emit();
  };

  renamePage = (pageId: string, name: string) => {
    const page = this.document.pages?.[pageId];
    if (!page) return;
    this.run(() => { this.document.pages = { ...this.document.pages, [pageId]: { ...page, name } }; });
  };

  deletePage = (pageId: string) => {
    if (!this.document.pages || Object.keys(this.document.pages).length <= 1) return;
    this.run(() => {
      const nextPages = { ...this.document.pages };
      delete nextPages[pageId];
      Object.keys(this.document.shapes).forEach((id) => { if (this.document.shapes[id].pageId === pageId) delete this.document.shapes[id]; });
      const orderedPages = Object.values(nextPages).sort((a, b) => a.index - b.index);
      orderedPages.forEach((page, index) => { nextPages[page.id] = { ...page, index }; });
      const nextPageId = orderedPages[0].id;
      this.document.pages = nextPages;
      this.document.currentPageId = nextPageId;
      this.session.currentPageId = nextPageId;
      this.session.camera = { ...(this.document.pages[nextPageId].camera ?? DEFAULT_CAMERA) };
      this.session.selectedIds = [];
    });
  };

  setPreferences = (preferences: Partial<UserPreferences>) => {
    this.session.preferences = { ...this.session.preferences, ...preferences };
    this.emit();
  };

  undo = () => {
    const previous = this.history.pop();
    if (!previous) return;
    this.future.push(this.getDocument());
    this.document = migrateDocument(previous);
    this.session.currentPageId = this.document.currentPageId ?? DEFAULT_PAGE_ID;
    this.session.camera = { ...(this.document.pages?.[this.session.currentPageId]?.camera ?? this.document.camera) };
    this.session.selectedIds = [];
    this.emit();
  };

  redo = () => {
    const next = this.future.pop();
    if (!next) return;
    this.history.push(this.getDocument());
    this.document = migrateDocument(next);
    this.session.currentPageId = this.document.currentPageId ?? DEFAULT_PAGE_ID;
    this.session.camera = { ...(this.document.pages?.[this.session.currentPageId]?.camera ?? this.document.camera) };
    this.session.selectedIds = [];
    this.emit();
  };

  clearCanvas = () => this.run(() => {
    const ids = getPageShapes(this.document, this.session.currentPageId).map((shape) => shape.id);
    this.deleteShapes(ids);
  });
}

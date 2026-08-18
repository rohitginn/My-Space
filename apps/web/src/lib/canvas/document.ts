import type {
  Camera,
  CanvasDocument,
  CanvasShape,
  DocumentSettings,
  PageRecord,
  UserPreferences,
} from './types';

export const DOCUMENT_VERSION = 2;
export const DEFAULT_PAGE_ID = 'page:default';

export const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

export const DEFAULT_SETTINGS: DocumentSettings = {
  gridSize: 20,
  background: 'var(--canvas-paper)',
};

export const DEFAULT_PREFERENCES: UserPreferences = {
  colorMode: 'system',
  showGrid: true,
  snapToGrid: false,
  snapToObjects: true,
  isToolLocked: false,
  reduceMotion: false,
};

function clone<T>(value: T): T {
  return typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value)) as T;
}

function createPage(): PageRecord {
  return { id: DEFAULT_PAGE_ID, name: 'Page 1', index: 0 };
}

function normalizeShape(shape: CanvasShape, pageId: string, fallbackIndex: number): CanvasShape {
  return {
    ...shape,
    pageId: shape.pageId ?? pageId,
    parentId: shape.parentId ?? pageId,
    index: shape.index ?? String(fallbackIndex).padStart(8, '0'),
    locked: shape.locked ?? false,
    meta: shape.meta ?? {},
  } as CanvasShape;
}

/**
 * Converts the original flat `{ shapes, camera }` payload into the normalized
 * record model. This remains deliberately tolerant so old boards keep opening.
 */
export function normalizeDocument(input?: Partial<CanvasDocument> | null): CanvasDocument {
  const pages = input?.pages && Object.keys(input.pages).length > 0
    ? clone(input.pages)
    : { [DEFAULT_PAGE_ID]: createPage() };
  const currentPageId = input?.currentPageId && pages[input.currentPageId]
    ? input.currentPageId
    : Object.keys(pages).sort((a, b) => pages[a].index - pages[b].index)[0] ?? DEFAULT_PAGE_ID;
  const shapes = Object.values(input?.shapes ?? {}).reduce<Record<string, CanvasShape>>((acc, shape, index) => {
    acc[shape.id] = normalizeShape(shape, shape.pageId ?? currentPageId, index);
    return acc;
  }, {});

  if (!pages[currentPageId]) pages[currentPageId] = createPage();

  return {
    version: DOCUMENT_VERSION,
    pages,
    currentPageId,
    shapes,
    assets: clone(input?.assets ?? {}),
    bindings: clone(input?.bindings ?? {}),
    settings: { ...DEFAULT_SETTINGS, ...(input?.settings ?? {}) },
    metadata: clone(input?.metadata ?? {}),
    comments: clone(input?.comments ?? []),
    camera: { ...DEFAULT_CAMERA, ...(input?.camera ?? {}) },
  };
}

export function serializeDocument(document: CanvasDocument): CanvasDocument {
  const normalized = normalizeDocument(document);
  normalized.version = DOCUMENT_VERSION;
  normalized.metadata = {
    ...normalized.metadata,
    updatedAt: new Date().toISOString(),
  };
  return clone(normalized);
}

export function getPageShapes(document: CanvasDocument, pageId = document.currentPageId ?? DEFAULT_PAGE_ID): CanvasShape[] {
  return Object.values(document.shapes ?? {})
    .filter((shape) => (shape.pageId ?? pageId) === pageId)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
}

export function migrateDocument(input?: Partial<CanvasDocument> | null): CanvasDocument {
  return normalizeDocument(input);
}

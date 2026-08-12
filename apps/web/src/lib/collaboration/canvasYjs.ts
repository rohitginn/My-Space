import * as Y from 'yjs';

import type { CanvasDocument } from '@/lib/canvas';

function jsonMap(root: Y.Map<unknown>, name: string) {
  let map = root.get(name) as Y.Map<string> | undefined;
  if (!map) {
    map = new Y.Map<string>();
    root.set(name, map);
  }
  return map;
}

function replaceMap(root: Y.Map<unknown>, name: string, values: Record<string, unknown>) {
  const map = jsonMap(root, name);
  for (const key of Array.from(map.keys())) if (!(key in values)) map.delete(key);
  for (const [key, value] of Object.entries(values)) map.set(key, JSON.stringify(value));
}

function readMap(root: Y.Map<unknown>, name: string) {
  const map = root.get(name) as Y.Map<string> | undefined;
  if (!map) return {};
  return Object.fromEntries(Array.from(map.entries()).flatMap(([key, value]) => {
    try { return [[key, JSON.parse(value)]] as const; } catch { return []; }
  }));
}

export function applyCanvasSnapshot(doc: Y.Doc, snapshot: CanvasDocument, origin = 'local') {
  const root = doc.getMap<unknown>('canvas');
  doc.transact(() => {
    replaceMap(root, 'shapes', snapshot.shapes ?? {});
    replaceMap(root, 'pages', snapshot.pages ?? {});
    replaceMap(root, 'assets', snapshot.assets ?? {});
    replaceMap(root, 'bindings', snapshot.bindings ?? {});
    root.set('version', snapshot.version ?? 2);
    root.set('currentPageId', snapshot.currentPageId ?? 'page:default');
    root.set('settings', JSON.stringify(snapshot.settings ?? {}));
    root.set('metadata', JSON.stringify(snapshot.metadata ?? {}));
    root.set('camera', JSON.stringify(snapshot.camera ?? { x: 0, y: 0, zoom: 1 }));
  }, origin);
}

export function readCanvasSnapshot(doc: Y.Doc): CanvasDocument {
  const root = doc.getMap<unknown>('canvas');
  const parse = <T>(name: string, fallback: T) => {
    const value = root.get(name);
    if (typeof value !== 'string') return fallback;
    try { return JSON.parse(value) as T; } catch { return fallback; }
  };
  return {
    version: Number(root.get('version') ?? 2),
    pages: readMap(root, 'pages'),
    currentPageId: String(root.get('currentPageId') ?? 'page:default'),
    assets: readMap(root, 'assets'),
    bindings: readMap(root, 'bindings'),
    settings: parse('settings', {}),
    metadata: parse('metadata', {}),
    shapes: readMap(root, 'shapes'),
    camera: parse('camera', { x: 0, y: 0, zoom: 1 }),
  } as CanvasDocument;
}

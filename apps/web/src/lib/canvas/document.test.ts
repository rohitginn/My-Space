import { describe, expect, it } from 'vitest';
import { DEFAULT_PAGE_ID, DOCUMENT_VERSION, migrateDocument, normalizeDocument, serializeDocument } from './document';
import type { CanvasDocument } from './types';

describe('canvas document migrations', () => {
  it('normalizes the legacy flat payload', () => {
    const legacy: CanvasDocument = {
      camera: { x: 10, y: 20, zoom: 1.5 },
      shapes: {
        box: {
          id: 'box', type: 'rectangle', x: 2, y: 3, width: 40, height: 30,
          rotation: 0, color: '#000', strokeWidth: 2, strokeStyle: 'solid',
          fill: 'transparent', fillStyle: 'none', opacity: 1, zIndex: 0,
          borderRadius: 4,
        },
      },
    };
    const normalized = migrateDocument(legacy);
    expect(normalized.version).toBe(DOCUMENT_VERSION);
    expect(normalized.currentPageId).toBe(DEFAULT_PAGE_ID);
    expect(normalized.pages?.[DEFAULT_PAGE_ID]).toBeDefined();
    expect(normalized.shapes.box.pageId).toBe(DEFAULT_PAGE_ID);
    expect(normalized.shapes.box.locked).toBe(false);
  });

  it('serializes a stable versioned snapshot', () => {
    const serialized = serializeDocument(normalizeDocument());
    expect(serialized.version).toBe(DOCUMENT_VERSION);
    expect(serialized.pages).toBeDefined();
    expect(serialized.assets).toEqual({});
    expect(serialized.bindings).toEqual({});
  });

  it('preserves comments in normalized snapshots', () => {
    const comments = [{
      id: 'comment-1',
      canvasId: 'canvas-1',
      userId: 'user-1',
      userName: 'Ada',
      avatarUrl: null,
      x: 120,
      y: 80,
      content: 'Review this area',
      isResolved: false,
      createdAt: '2026-08-17T00:00:00.000Z',
    }];
    const serialized = serializeDocument(normalizeDocument({ comments }));

    expect(serialized.comments).toEqual(comments);
  });
});

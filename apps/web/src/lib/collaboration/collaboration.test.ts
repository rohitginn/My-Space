import * as Y from 'yjs';
import { describe, expect, it } from 'vitest';

import type { CanvasDocument } from '@/lib/canvas';
import { applyCanvasSnapshot, readCanvasSnapshot } from './canvasYjs';
import { applyNoteSnapshot, readNoteSnapshot } from './noteYjs';

const snapshot = (shapes: CanvasDocument['shapes']): CanvasDocument => ({
  version: 2,
  pages: { 'page:default': { id: 'page:default', name: 'Page 1', index: 0 } },
  currentPageId: 'page:default',
  shapes,
  assets: {},
  bindings: {},
  settings: { gridSize: 20, background: 'paper' },
  metadata: {},
  camera: { x: 0, y: 0, zoom: 1 },
});

describe('Yjs collaboration adapters', () => {
  it('merges independent shape edits without dropping either shape', () => {
    const first = new Y.Doc();
    const second = new Y.Doc();
    applyCanvasSnapshot(first, snapshot({}), 'local');
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first), 'remote');

    let firstEdit: Uint8Array | undefined;
    let secondEdit: Uint8Array | undefined;
    first.on('update', (update, origin) => { if (origin === 'local') firstEdit = update; });
    second.on('update', (update, origin) => { if (origin === 'local') secondEdit = update; });
    applyCanvasSnapshot(first, snapshot({ one: { id: 'one', type: 'rectangle' } as never }), 'local');
    applyCanvasSnapshot(second, snapshot({ two: { id: 'two', type: 'ellipse' } as never }), 'local');

    Y.applyUpdate(first, secondEdit!, 'remote');
    Y.applyUpdate(second, firstEdit!, 'remote');

    expect(Object.keys(readCanvasSnapshot(first).shapes)).toEqual(expect.arrayContaining(['one', 'two']));
    expect(Object.keys(readCanvasSnapshot(second).shapes)).toEqual(expect.arrayContaining(['one', 'two']));
  });

  it('keeps the Y.Text note projection synchronized', () => {
    const first = new Y.Doc();
    const second = new Y.Doc();
    applyNoteSnapshot(first, { title: 'Spec', content: 'Remote edit' });
    Y.applyUpdate(second, Y.encodeStateAsUpdate(first), 'remote');
    expect(readNoteSnapshot(second)).toEqual({ title: 'Spec', content: 'Remote edit' });
  });
});

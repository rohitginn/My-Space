import { describe, expect, it } from 'vitest';
import { CanvasEditor } from './editor';
import type { CanvasShape } from './types';

const rectangle = (id: string, x = 0): CanvasShape => ({
  id, type: 'rectangle', x, y: 0, width: 100, height: 60, rotation: 0,
  color: '#287f74', strokeWidth: 2, strokeStyle: 'solid', fill: 'transparent',
  fillStyle: 'none', opacity: 1, zIndex: 0, borderRadius: 8,
});

describe('CanvasEditor', () => {
  it('groups a transaction into one undo step', () => {
    const editor = new CanvasEditor();
    editor.run(() => {
      editor.addShape(rectangle('one'));
      editor.addShape(rectangle('two', 120));
    });
    expect(Object.keys(editor.getDocument().shapes)).toHaveLength(2);
    editor.undo();
    expect(Object.keys(editor.getDocument().shapes)).toHaveLength(0);
    editor.redo();
    expect(Object.keys(editor.getDocument().shapes)).toHaveLength(2);
  });

  it('does not mutate locked shapes', () => {
    const editor = new CanvasEditor();
    editor.addShape({ ...rectangle('locked'), locked: true });
    editor.updateShape('locked', { x: 80 });
    expect(editor.getDocument().shapes.locked.x).toBe(0);
  });

  it('keeps page scenes independent', () => {
    const editor = new CanvasEditor();
    editor.addShape(rectangle('first'));
    editor.createPage({ id: 'page:second', name: 'Page 2' });
    editor.addShape(rectangle('second'));
    expect(Object.keys(editor.getSnapshot().shapes)).toEqual(['second']);
    editor.switchPage('page:default');
    expect(Object.keys(editor.getSnapshot().shapes)).toEqual(['first']);
  });

  it('duplicates and reorders pages with their scene content', () => {
    const editor = new CanvasEditor();
    editor.addShape(rectangle('first'));
    editor.duplicatePage('page:default');
    expect(editor.getDocument().pages?.['page:default']?.name).toBe('Page 1');
    expect(editor.getDocument().pages?.[editor.getDocument().currentPageId ?? '']?.name).toBe('Page 1 copy');
    expect(Object.keys(editor.getSnapshot().shapes)).toHaveLength(1);
    editor.reorderPage(editor.getDocument().currentPageId ?? '', 'up');
    expect(editor.getSnapshot().pages[0].name).toBe('Page 1 copy');
  });

  it('keeps an arrow endpoint attached to a moved target', () => {
    const editor = new CanvasEditor();
    editor.addShape(rectangle('target', 100));
    editor.addShape({
      id: 'arrow', type: 'arrow', x: 0, y: 30, width: 100, height: 0, rotation: 0,
      color: '#287f74', strokeWidth: 2, strokeStyle: 'solid', fill: 'transparent',
      fillStyle: 'none', opacity: 1, zIndex: 1, arrowHead: 'end',
      start: { x: 0, y: 30 }, end: { x: 100, y: 30 },
    });
    editor.createBinding({
      id: 'binding:end', type: 'arrow', fromId: 'arrow', toId: 'target', terminal: 'end',
      normalizedAnchor: { x: 0, y: 0.5 },
    });
    editor.moveShapes(['target'], 50, 20);
    const arrow = editor.getDocument().shapes.arrow as CanvasShape & { end?: { x: number; y: number } };
    expect(arrow.end).toEqual({ x: 150, y: 50 });
  });

  it('aligns and distributes selected shapes transactionally', () => {
    const editor = new CanvasEditor();
    editor.addShape(rectangle('a', 0));
    editor.addShape({ ...rectangle('b', 140), y: 40 });
    editor.addShape({ ...rectangle('c', 300), y: 80 });
    editor.alignShapes(['a', 'b', 'c'], 'top');
    expect(editor.getDocument().shapes.a.y).toBe(0);
    expect(editor.getDocument().shapes.b.y).toBe(0);
    expect(editor.getDocument().shapes.c.y).toBe(0);
    editor.distributeShapes(['a', 'b', 'c'], 'horizontal');
    expect(editor.getDocument().shapes.b.x).toBe(150);
  });

  it('stores imported assets independently from image placement', () => {
    const editor = new CanvasEditor();
    editor.createAsset({ id: 'asset:one', type: 'image', src: 'data:image/png;base64,abc', width: 20, height: 20 });
    editor.addShape({ id: 'image', type: 'image', assetId: 'asset:one', fit: 'contain', x: 0, y: 0, width: 20, height: 20, rotation: 0, color: '#287f74', strokeWidth: 1, strokeStyle: 'solid', fill: 'transparent', fillStyle: 'none', opacity: 1, zIndex: 0 });
    expect(editor.getDocument().assets?.['asset:one']?.src).toContain('data:image');
    expect(editor.getDocument().shapes.image.type).toBe('image');
  });

  it('prunes an asset after its last media shape is deleted', () => {
    const editor = new CanvasEditor();
    editor.createAsset({ id: 'asset:one', type: 'image', src: 'data:image/png;base64,abc', width: 20, height: 20 });
    editor.addShape({ id: 'image', type: 'image', assetId: 'asset:one', fit: 'contain', x: 0, y: 0, width: 20, height: 20, rotation: 0, color: '#287f74', strokeWidth: 1, strokeStyle: 'solid', fill: 'transparent', fillStyle: 'none', opacity: 1, zIndex: 0 });
    editor.deleteShapes(['image']);
    expect(editor.getDocument().assets?.['asset:one']).toBeUndefined();
  });

  it('moves grouped children with their group boundary', () => {
    const editor = new CanvasEditor();
    editor.addShape(rectangle('child'));
    editor.group(['child'], 'group', { x: 0, y: 0, width: 100, height: 60 });
    editor.moveShapes(['group'], 20, 15);
    expect(editor.getDocument().shapes.child.x).toBe(20);
    expect(editor.getDocument().shapes.child.y).toBe(15);
    expect(editor.getDocument().shapes.group.x).toBe(20);
  });

  it('keeps a separate camera for each page', () => {
    const editor = new CanvasEditor();
    editor.setCamera({ x: 40, y: 20, zoom: 1.5 });
    editor.createPage({ id: 'page:two', name: 'Page 2' });
    expect(editor.getSnapshot().camera).toEqual({ x: 0, y: 0, zoom: 1 });
    editor.setCamera({ x: -20, y: 30, zoom: 0.75 });
    editor.switchPage('page:default');
    expect(editor.getSnapshot().camera).toEqual({ x: 40, y: 20, zoom: 1.5 });
  });
});

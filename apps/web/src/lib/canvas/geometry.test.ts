import { describe, expect, it } from 'vitest';
import { getConnectionPoints, getGeometry, hitTest } from './geometry';
import type { CanvasShape } from './types';

const diamond: CanvasShape = {
  id: 'diamond', type: 'diamond', x: 0, y: 0, width: 100, height: 100, rotation: 0,
  color: '#287f74', strokeWidth: 2, strokeStyle: 'solid', fill: '#fff', fillStyle: 'solid', opacity: 1, zIndex: 0,
};

describe('canvas geometry', () => {
  it('uses shape geometry rather than only the bounding box', () => {
    expect(getGeometry(diamond).containsPoint({ x: 50, y: 50 })).toBe(true);
    expect(getGeometry(diamond).containsPoint({ x: 2, y: 2 })).toBe(false);
  });

  it('returns the topmost interactive shape', () => {
    const lower = { ...diamond, id: 'lower', zIndex: 1 };
    const upper = { ...diamond, id: 'upper', zIndex: 2 };
    expect(hitTest([lower, upper], { x: 50, y: 50 })?.id).toBe('upper');
  });

  it('exposes reusable connection points', () => {
    const points = getConnectionPoints({ ...diamond, id: 'box', width: 100, height: 60 });
    expect(points).toEqual(expect.arrayContaining([
      { x: 50, y: 0 },
      { x: 100, y: 30 },
      { x: 50, y: 60 },
      { x: 0, y: 30 },
    ]));
    expect(getGeometry(diamond).connectionPoints.length).toBeGreaterThanOrEqual(5);
  });
});

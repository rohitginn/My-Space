import { getShapeBounds, getShapeCenter, isPointInRotatedShape, getShapeVertices, distance } from './math';
import type { AABB, CanvasShape, Point } from './types';

export interface ShapeGeometry {
  bounds: AABB;
  center: Point;
  vertices: Point[];
  containsPoint(point: Point, margin?: number): boolean;
  distanceToPoint(point: Point): number;
  connectionPoints: Point[];
}

export function getConnectionPoints(shape: CanvasShape): Point[] {
  const bounds = getShapeBounds(shape);
  const center = getShapeCenter(shape);
  const vertices = getShapeVertices(shape);
  return [
    { x: center.x, y: bounds.minY },
    { x: bounds.maxX, y: center.y },
    { x: center.x, y: bounds.maxY },
    { x: bounds.minX, y: center.y },
    center,
    ...vertices,
  ];
}

export function getGeometry(shape: CanvasShape): ShapeGeometry {
  const bounds = getShapeBounds(shape);
  const center = getShapeCenter(shape);
  const vertices = getShapeVertices(shape);
  return {
    bounds,
    center,
    vertices,
    connectionPoints: getConnectionPoints(shape),
    containsPoint: (point, margin = 4) => isPointInRotatedShape(point, shape, margin),
    distanceToPoint: (point) => {
      if (isPointInRotatedShape(point, shape, 0)) return 0;
      const dx = Math.max(bounds.minX - point.x, 0, point.x - bounds.maxX);
      const dy = Math.max(bounds.minY - point.y, 0, point.y - bounds.maxY);
      return Math.sqrt(dx * dx + dy * dy);
    },
  };
}

export function getSelectionBounds(shapes: CanvasShape[]): AABB | null {
  if (shapes.length === 0) return null;
  return shapes.reduce<AABB>((result, shape) => {
    const bounds = getShapeBounds(shape);
    return {
      minX: Math.min(result.minX, bounds.minX),
      minY: Math.min(result.minY, bounds.minY),
      maxX: Math.max(result.maxX, bounds.maxX),
      maxY: Math.max(result.maxY, bounds.maxY),
    };
  }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
}

export function hitTest(shapes: CanvasShape[], point: Point, margin = 4): CanvasShape | null {
  return [...shapes]
    .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0))
    .find((shape) => !shape.locked && getGeometry(shape).containsPoint(point, margin)) ?? null;
}

export function nearestSnapPoint(shape: CanvasShape, target: CanvasShape): Point {
  const source = getShapeCenter(shape);
  const bounds = getShapeBounds(target);
  const candidates = [
    { x: bounds.minX, y: source.y },
    { x: bounds.maxX, y: source.y },
    { x: source.x, y: bounds.minY },
    { x: source.x, y: bounds.maxY },
    getShapeCenter(target),
  ];
  return candidates.sort((a, b) => distance(source, a) - distance(source, b))[0];
}

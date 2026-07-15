// ============================================================
// Custom Infinite Canvas Engine - Coordinate Math Utilities
// ============================================================

import type { Camera, Point, AABB, CanvasShape, PenShape } from './types';

// ── Coordinate Transformations ──────────────────────────────

/** Convert screen coordinates (clientX/Y) to world coordinates */
export function screenToWorld(
  clientX: number,
  clientY: number,
  camera: Camera,
  containerRect: DOMRect
): Point {
  const relativeX = clientX - containerRect.left;
  const relativeY = clientY - containerRect.top;
  return {
    x: (relativeX - camera.x) / camera.zoom,
    y: (relativeY - camera.y) / camera.zoom,
  };
}

/** Convert world coordinates to screen coordinates */
export function worldToScreen(worldX: number, worldY: number, camera: Camera): Point {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  };
}

/** Get the SVG viewBox-compatible transform string for the camera */
export function getCameraTransform(camera: Camera): string {
  return `translate(${camera.x}, ${camera.y}) scale(${camera.zoom})`;
}

// ── Zoom Helpers ────────────────────────────────────────────

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 10;

/** Zoom toward a specific point on screen (e.g., mouse position) */
export function zoomAtPoint(
  camera: Camera,
  clientX: number,
  clientY: number,
  containerRect: DOMRect,
  delta: number
): Camera {
  const zoomFactor = 1 - delta * 0.001;
  const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * zoomFactor));

  // The point on screen we are zooming towards
  const mouseX = clientX - containerRect.left;
  const mouseY = clientY - containerRect.top;

  // Adjust pan to keep the point under the cursor fixed
  const scale = newZoom / camera.zoom;
  const newX = mouseX - (mouseX - camera.x) * scale;
  const newY = mouseY - (mouseY - camera.y) * scale;

  return { x: newX, y: newY, zoom: newZoom };
}

// ── Bounding Box Calculations ───────────────────────────────

/** Calculate the AABB for any shape */
export function getShapeBounds(shape: CanvasShape): AABB {
  if (shape.type === 'pen') {
    return getPenBounds(shape as PenShape);
  }

  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x;
    const y1 = shape.y;
    const x2 = shape.x + shape.width;
    const y2 = shape.y + shape.height;
    return {
      minX: Math.min(x1, x2),
      minY: Math.min(y1, y2),
      maxX: Math.max(x1, x2),
      maxY: Math.max(y1, y2),
    };
  }

  return {
    minX: shape.x,
    minY: shape.y,
    maxX: shape.x + shape.width,
    maxY: shape.y + shape.height,
  };
}

/** Calculate the AABB from pen points */
function getPenBounds(shape: PenShape): AABB {
  if (shape.points.length === 0) {
    return { minX: shape.x, minY: shape.y, maxX: shape.x, maxY: shape.y };
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of shape.points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

// ── Viewport Culling ────────────────────────────────────────

/** Get the visible world-space bounds from the camera and container */
export function getViewportBounds(camera: Camera, containerRect: DOMRect): AABB {
  const topLeft = screenToWorld(containerRect.left, containerRect.top, camera, containerRect);
  const bottomRight = screenToWorld(
    containerRect.left + containerRect.width,
    containerRect.top + containerRect.height,
    camera,
    containerRect
  );
  return {
    minX: topLeft.x,
    minY: topLeft.y,
    maxX: bottomRight.x,
    maxY: bottomRight.y,
  };
}

/** Check if two AABBs overlap (for viewport culling) */
export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

// ── Hit Testing ─────────────────────────────────────────────

/** Check if a world-space point is inside a shape's bounds (with padding) */
export function isPointInShape(point: Point, shape: CanvasShape, padding: number = 4): boolean {
  const bounds = getShapeBounds(shape);
  const padded: AABB = {
    minX: bounds.minX - padding,
    minY: bounds.minY - padding,
    maxX: bounds.maxX + padding,
    maxY: bounds.maxY + padding,
  };

  if (point.x < padded.minX || point.x > padded.maxX || point.y < padded.minY || point.y > padded.maxY) {
    return false;
  }

  // For rectangles and text: simple AABB check is sufficient
  if (shape.type === 'rectangle' || shape.type === 'text') {
    return true;
  }

  // For ellipses: check if point is inside the ellipse equation
  if (shape.type === 'ellipse') {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const rx = shape.width / 2 + padding;
    const ry = shape.height / 2 + padding;
    const dx = point.x - cx;
    const dy = point.y - cy;
    return (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  // For lines and arrows: check distance from the line segment
  if (shape.type === 'line' || shape.type === 'arrow') {
    const x1 = shape.x;
    const y1 = shape.y;
    const x2 = shape.x + shape.width;
    const y2 = shape.y + shape.height;
    const dist = pointToSegmentDistance(point, { x: x1, y: y1 }, { x: x2, y: y2 });
    return dist <= padding + shape.strokeWidth;
  }

  // For pen paths: check distance to any line segment in the path
  if (shape.type === 'pen') {
    const penShape = shape as PenShape;
    for (let i = 0; i < penShape.points.length - 1; i++) {
      const dist = pointToSegmentDistance(point, penShape.points[i], penShape.points[i + 1]);
      if (dist <= padding + shape.strokeWidth) return true;
    }
    return false;
  }

  return true;
}

/** Calculate distance from a point to a line segment */
function pointToSegmentDistance(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    // a and b are the same point
    return Math.sqrt((p.x - a.x) ** 2 + (p.y - a.y) ** 2);
  }

  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.sqrt((p.x - projX) ** 2 + (p.y - projY) ** 2);
}

// ── Path Smoothing (Douglas-Peucker + Bezier) ───────────────

/**
 * Douglas-Peucker line simplification algorithm.
 * Removes redundant points from a polyline within epsilon tolerance.
 */
export function simplifyPath(points: Point[], epsilon: number = 1.5): Point[] {
  if (points.length <= 2) return points;

  // Find the point with the maximum distance from the line (first, last)
  let maxDist = 0;
  let maxIdx = 0;
  const first = points[0];
  const last = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = pointToSegmentDistance(points[i], first, last);
    if (dist > maxDist) {
      maxDist = dist;
      maxIdx = i;
    }
  }

  // If max distance is greater than epsilon, recursively simplify both halves
  if (maxDist > epsilon) {
    const left = simplifyPath(points.slice(0, maxIdx + 1), epsilon);
    const right = simplifyPath(points.slice(maxIdx), epsilon);
    return [...left.slice(0, -1), ...right];
  }

  // Otherwise, return just the endpoints
  return [first, last];
}

/**
 * Convert an array of points into a smooth SVG path string
 * using quadratic Bezier curves through midpoints.
 */
export function pointsToSmoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;
  }

  let d = `M ${points[0].x} ${points[0].y}`;

  // Use quadratic curves through midpoints for smoothness
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const midX = (current.x + next.x) / 2;
    const midY = (current.y + next.y) / 2;

    if (i === 0) {
      d += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
    } else {
      d += ` Q ${current.x} ${current.y}, ${midX} ${midY}`;
    }
  }

  // End with the last point
  const last = points[points.length - 1];
  d += ` L ${last.x} ${last.y}`;

  return d;
}

/** Generate a raw SVG path from points (for live drawing preview) */
export function pointsToRawPath(points: Point[]): string {
  if (points.length === 0) return '';
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length; i++) {
    d += ` L ${points[i].x} ${points[i].y}`;
  }
  return d;
}

// ── ID Generation ───────────────────────────────────────────

/** Generate a unique shape ID */
export function generateId(): string {
  return `shape_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ── Distance helpers ────────────────────────────────────────

/** Euclidean distance between two points */
export function distance(a: Point, b: Point): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

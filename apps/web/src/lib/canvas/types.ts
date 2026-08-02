// ============================================================
// Custom Infinite Canvas Engine - Type Definitions
// ============================================================

/** Camera represents the viewport's pan offset and zoom level */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** A 2D point in world space */
export interface Point {
  x: number;
  y: number;
}

/** Axis-Aligned Bounding Box */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** All available shape types */
export type ShapeType =
  | 'pen'
  | 'rectangle'
  | 'ellipse'
  | 'line'
  | 'arrow'
  | 'text'
  | 'sticky-note'
  | 'diamond'
  | 'triangle'
  | 'star'
  | 'hexagon'
  | 'parallelogram'
  | 'trapezoid'
  | 'cylinder'
  | 'callout';

export type ToolType = ShapeType | 'select' | 'pan' | 'eraser' | 'comment';

/** Stroke rendering style */
export type StrokeStyleType = 'solid' | 'dashed' | 'dotted';

/** Fill rendering style (roughjs compatible) */
export type FillStyleType = 'none' | 'hachure' | 'solid' | 'cross-hatch';

/** Base shape interface — every shape on the canvas extends this */
export interface BaseShape {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  strokeWidth: number;
  strokeStyle: StrokeStyleType;
  fill: string;
  fillStyle: FillStyleType;
  opacity: number;
  zIndex: number;
}

/** Pen / Freehand shape — stores a series of points forming a path */
export interface PenShape extends BaseShape {
  type: 'pen';
  points: Point[];
  pathData: string; // Pre-computed SVG path "d" attribute
}

/** Rectangle shape */
export interface RectangleShape extends BaseShape {
  type: 'rectangle';
  borderRadius: number;
}

/** Ellipse shape */
export interface EllipseShape extends BaseShape {
  type: 'ellipse';
}

/** Line shape — from (x,y) to (x+width, y+height) */
export interface LineShape extends BaseShape {
  type: 'line';
}

/** Arrow shape — a line with customizable arrowheads and elbows */
export interface ArrowShape extends BaseShape {
  type: 'arrow';
  arrowHead?: 'none' | 'start' | 'end' | 'both';
  arrowStyle?: 'straight' | 'curved' | 'elbow';
}

/** Text shape — editable text block */
export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
}

/** Sticky Note shape — pastel colored sticky note with text */
export interface StickyNoteShape extends BaseShape {
  type: 'sticky-note';
  text: string;
  fontSize: number;
  noteColor: string;
}

export interface DiamondShape extends BaseShape { type: 'diamond'; }
export interface TriangleShape extends BaseShape { type: 'triangle'; }
export interface StarShape extends BaseShape { type: 'star'; }
export interface HexagonShape extends BaseShape { type: 'hexagon'; }
export interface ParallelogramShape extends BaseShape { type: 'parallelogram'; }
export interface TrapezoidShape extends BaseShape { type: 'trapezoid'; }
export interface CylinderShape extends BaseShape { type: 'cylinder'; }
export interface CalloutShape extends BaseShape { type: 'callout'; }

/** Union of all shape types */
export type CanvasShape =
  | PenShape
  | RectangleShape
  | EllipseShape
  | LineShape
  | ArrowShape
  | TextShape
  | StickyNoteShape
  | DiamondShape
  | TriangleShape
  | StarShape
  | HexagonShape
  | ParallelogramShape
  | TrapezoidShape
  | CylinderShape
  | CalloutShape;

export interface RemoteCursor {
  userId: string;
  x: number;
  y: number;
  name: string;
  color: string;
}

export interface RoomUser {
  socketId: string;
  userId: string;
  userName: string;
  userColor: string;
}

export interface CommentPin {
  id: string;
  canvasId: string;
  workspaceId: string;
  userId: string;
  userName: string;
  x: number;
  y: number;
  content: string;
  isResolved: boolean;
  createdAt: string;
}

/** The full document state serialized to/from the database */
export interface CanvasDocument {
  shapes: Record<string, CanvasShape>;
  camera: Camera;
}

/** Undo/Redo command interface */
export interface Command {
  execute: () => void;
  undo: () => void;
  description: string;
}

/** Resize handle positions */
export type HandlePosition = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'rotation';

/** Style settings for the current drawing tool */
export interface ToolStyle {
  color: string;
  strokeWidth: number;
  strokeStyle: StrokeStyleType;
  fill: string;
  fillStyle: FillStyleType;
  opacity: number;
  fontSize: number;
  borderRadius: number;
}

// ============================================================
// Custom Infinite Canvas Engine - Type Definitions
// ============================================================

/** Camera represents the viewport's pan offset and zoom level */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export type RecordId = string;

export interface PageRecord {
  id: RecordId;
  name: string;
  index: number;
  camera?: Camera;
  meta?: Record<string, unknown>;
}

export interface AssetRecord {
  id: RecordId;
  type: 'image' | 'video' | 'bookmark' | 'embed';
  src: string;
  mimeType?: string;
  width?: number;
  height?: number;
  name?: string;
  sizeBytes?: number;
  meta?: Record<string, unknown>;
}

export interface BindingRecord {
  id: RecordId;
  type: 'arrow';
  fromId: RecordId;
  toId: RecordId;
  terminal: 'start' | 'end';
  normalizedAnchor: Point;
  isPrecise?: boolean;
  meta?: Record<string, unknown>;
}

export interface UserPreferences {
  colorMode: 'light' | 'dark' | 'system';
  showGrid: boolean;
  snapToGrid: boolean;
  snapToObjects: boolean;
  isToolLocked: boolean;
  reduceMotion: boolean;
}

export interface DocumentSettings {
  gridSize: number;
  background: string;
}

export interface DocumentMetadata {
  title?: string;
  createdAt?: string;
  updatedAt?: string;
}

/** A 2D point in world space */
export interface Point {
  x: number;
  y: number;
  pressure?: number;
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
  | 'highlighter'
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
  | 'octagon'
  | 'cloud'
  | 'parallelogram'
  | 'trapezoid'
  | 'cylinder'
  | 'callout'
  | 'frame'
  | 'image'
  | 'video'
  | 'bookmark'
  | 'embed';


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
  pageId?: string;
  parentId?: string;
  index?: string;
  locked?: boolean;
  meta?: Record<string, unknown>;
  props?: Record<string, unknown>;
}

export interface ImageShape extends BaseShape {
  type: 'image';
  assetId: string;
  fit: 'contain' | 'cover' | 'stretch';
}

export interface HighlighterShape extends BaseShape {
  type: 'highlighter';
  points: Point[];
  pathData: string;
}

export interface MediaShape extends BaseShape {
  type: 'video' | 'bookmark' | 'embed';
  assetId: string;
  fit?: 'contain' | 'cover' | 'stretch';
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
  start?: Point;
  end?: Point;
  label?: RichTextDocument;
}

/** Text shape — editable text block */
export interface TextShape extends BaseShape {
  type: 'text';
  text: string;
  fontSize: number;
  fontFamily: string;
  richText?: RichTextDocument;
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  autoSize?: boolean;
}

/** Sticky Note shape — pastel colored sticky note with text */
export interface StickyNoteShape extends BaseShape {
  type: 'sticky-note';
  text: string;
  fontSize: number;
  noteColor: string;
  richText?: RichTextDocument;
}

export interface RichTextMark {
  type: 'bold' | 'italic' | 'code' | 'highlight' | 'link';
  attrs?: Record<string, string>;
}

export interface RichTextNode {
  type: 'paragraph' | 'text' | 'bulletList' | 'orderedList' | 'listItem' | 'hardBreak';
  text?: string;
  marks?: RichTextMark[];
  attrs?: Record<string, unknown>;
  content?: RichTextNode[];
}

export interface RichTextDocument {
  type: 'doc';
  content: RichTextNode[];
}

export interface DiamondShape extends BaseShape { type: 'diamond'; }
export interface TriangleShape extends BaseShape { type: 'triangle'; }
export interface StarShape extends BaseShape { type: 'star'; }
export interface HexagonShape extends BaseShape { type: 'hexagon'; }
export interface OctagonShape extends BaseShape { type: 'octagon'; }
export interface CloudShape extends BaseShape { type: 'cloud'; }
export interface ParallelogramShape extends BaseShape { type: 'parallelogram'; }
export interface TrapezoidShape extends BaseShape { type: 'trapezoid'; }
export interface CylinderShape extends BaseShape { type: 'cylinder'; }
export interface CalloutShape extends BaseShape { type: 'callout'; }
export interface FrameShape extends BaseShape {
  type: 'frame';
  clipContent?: boolean;
  title?: string;
}

/** Union of all shape types */
export type CanvasShape =
  | PenShape
  | HighlighterShape
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
  | OctagonShape
  | CloudShape
  | ParallelogramShape
  | TrapezoidShape
  | CylinderShape
  | CalloutShape
  | FrameShape
  | ImageShape
  | MediaShape;

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
  version?: number;
  pages?: Record<string, PageRecord>;
  currentPageId?: string;
  assets?: Record<string, AssetRecord>;
  bindings?: Record<string, BindingRecord>;
  settings?: DocumentSettings;
  metadata?: DocumentMetadata;
  shapes: Record<string, CanvasShape>;
  camera: Camera;
}

export interface EditorSessionState {
  camera: Camera;
  currentPageId: string;
  selectedIds: string[];
  activeTool: ToolType;
  hoveredId: string | null;
  editingId: string | null;
  preferences: UserPreferences;
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
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  fontFamily?: string;
  arrowHead?: 'none' | 'start' | 'end' | 'both';
  arrowStyle?: 'straight' | 'curved' | 'elbow';
}

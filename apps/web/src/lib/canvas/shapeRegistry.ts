import type { CanvasShape, ShapeType, ToolStyle, Point } from './types';
import { getGeometry } from './geometry';

export interface ShapeDefinition<T extends CanvasShape = CanvasShape> {
  type: T['type'];
  label: string;
  canEdit: boolean;
  create: (input: { id: string; point: Point; style: ToolStyle; zIndex: number }) => T;
  getGeometry: (shape: T) => ReturnType<typeof getGeometry>;
}

const base = ({ id, point, style, zIndex, type, width = 0, height = 0 }: { id: string; point: Point; style: ToolStyle; zIndex: number; type: ShapeType; width?: number; height?: number }) => ({
  id, type, x: point.x, y: point.y, width, height, rotation: 0,
  color: style.color, strokeWidth: style.strokeWidth, strokeStyle: style.strokeStyle,
  fill: style.fill, fillStyle: style.fillStyle, opacity: style.opacity, zIndex,
  locked: false,
});

const geometric = (type: Exclude<ShapeType, 'pen' | 'highlighter' | 'text' | 'sticky-note' | 'image' | 'video' | 'bookmark' | 'embed' | 'frame'>, label: string): ShapeDefinition => ({
  type,
  label,
  canEdit: false,
  create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type }), ...(type === 'rectangle' ? { borderRadius: style.borderRadius } : {}) } as CanvasShape),
  getGeometry: (shape) => getGeometry(shape),
});

export const shapeRegistry: Record<ShapeType, ShapeDefinition> = {
  pen: {
    type: 'pen', label: 'Pen', canEdit: false,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'pen' }), points: [point], pathData: `M ${point.x} ${point.y}` } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  highlighter: {
    type: 'highlighter', label: 'Highlighter', canEdit: false,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'highlighter' }), points: [point], pathData: `M ${point.x} ${point.y}`, strokeWidth: Math.max(8, style.strokeWidth * 4), opacity: Math.min(style.opacity, 0.35), fill: 'transparent', fillStyle: 'none' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  rectangle: geometric('rectangle', 'Rectangle'),
  ellipse: geometric('ellipse', 'Ellipse'),
  line: geometric('line', 'Line'),
  arrow: {
    type: 'arrow', label: 'Arrow', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'arrow' }), arrowHead: style.arrowHead ?? 'end', arrowStyle: style.arrowStyle ?? 'straight', start: point, end: point } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  text: {
    type: 'text', label: 'Text', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'text', width: 200, height: 30 }), text: '', fontSize: style.fontSize, fontFamily: style.fontFamily ?? 'system-ui, sans-serif', fontWeight: style.fontWeight ?? 'regular', fontStyle: style.fontStyle ?? 'normal', textAlign: style.textAlign ?? 'left', verticalAlign: style.verticalAlign ?? 'top', autoSize: true } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  'sticky-note': {
    type: 'sticky-note', label: 'Sticky note', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'sticky-note', width: 160, height: 160 }), text: '', fontSize: 14, noteColor: '#f5d66b', fill: '#f5d66b' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  diamond: geometric('diamond', 'Diamond'),
  triangle: geometric('triangle', 'Triangle'),
  star: geometric('star', 'Star'),
  hexagon: geometric('hexagon', 'Hexagon'),
  octagon: geometric('octagon', 'Octagon'),
  cloud: geometric('cloud', 'Cloud'),
  parallelogram: geometric('parallelogram', 'Parallelogram'),
  trapezoid: geometric('trapezoid', 'Trapezoid'),
  cylinder: geometric('cylinder', 'Cylinder'),
  callout: geometric('callout', 'Callout'),
  frame: {
    type: 'frame', label: 'Frame', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'frame' }), color: style.color, fill: 'transparent', fillStyle: 'none', strokeStyle: 'dashed', clipContent: true, title: 'Frame' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  image: {
    type: 'image', label: 'Image', canEdit: false,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'image', width: 320, height: 220 }), assetId: '', fit: 'contain' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  video: {
    type: 'video', label: 'Video', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'video', width: 320, height: 200 }), assetId: '', fit: 'contain' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  bookmark: {
    type: 'bookmark', label: 'Bookmark', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'bookmark', width: 280, height: 120 }), assetId: '', fit: 'contain' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
  embed: {
    type: 'embed', label: 'Embed', canEdit: true,
    create: ({ id, point, style, zIndex }) => ({ ...base({ id, point, style, zIndex, type: 'embed', width: 360, height: 240 }), assetId: '', fit: 'contain' } as CanvasShape),
    getGeometry: (shape) => getGeometry(shape),
  },
};

export function getShapeDefinition(type: ShapeType) {
  return shapeRegistry[type];
}

export function createRegisteredShape(type: ShapeType, input: Parameters<ShapeDefinition['create']>[0]) {
  return getShapeDefinition(type).create(input);
}

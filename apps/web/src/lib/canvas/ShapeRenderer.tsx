// ============================================================
// Custom Canvas Engine - Individual Shape SVG Renderers
// ============================================================

import React from 'react';
import type {
  CanvasShape, PenShape, RectangleShape, EllipseShape,
  LineShape, ArrowShape, TextShape,
} from './types';

interface ShapeRendererProps {
  shape: CanvasShape;
  isSelected: boolean;
  onPointerDown?: (e: React.PointerEvent, shapeId: string) => void;
}

/** Renders a single Pen/Freehand path */
function PenRenderer({ shape, isSelected, onPointerDown }: ShapeRendererProps) {
  const pen = shape as PenShape;
  return (
    <path
      d={pen.pathData}
      fill="none"
      stroke={pen.color}
      strokeWidth={pen.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      opacity={pen.opacity}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown?.(e, shape.id)}
    />
  );
}

/** Renders a Rectangle */
function RectRenderer({ shape, isSelected, onPointerDown }: ShapeRendererProps) {
  const rect = shape as RectangleShape;
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={Math.abs(rect.width)}
      height={Math.abs(rect.height)}
      rx={rect.borderRadius}
      ry={rect.borderRadius}
      fill={rect.fill}
      stroke={rect.color}
      strokeWidth={rect.strokeWidth}
      opacity={rect.opacity}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown?.(e, shape.id)}
    />
  );
}

/** Renders an Ellipse */
function EllipseRenderer({ shape, isSelected, onPointerDown }: ShapeRendererProps) {
  const ellipse = shape as EllipseShape;
  const cx = ellipse.x + ellipse.width / 2;
  const cy = ellipse.y + ellipse.height / 2;
  const rx = Math.abs(ellipse.width) / 2;
  const ry = Math.abs(ellipse.height) / 2;
  return (
    <ellipse
      cx={cx}
      cy={cy}
      rx={rx}
      ry={ry}
      fill={ellipse.fill}
      stroke={ellipse.color}
      strokeWidth={ellipse.strokeWidth}
      opacity={ellipse.opacity}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown?.(e, shape.id)}
    />
  );
}

/** Renders a Line */
function LineRenderer({ shape, isSelected, onPointerDown }: ShapeRendererProps) {
  const line = shape as LineShape;
  return (
    <line
      x1={line.x}
      y1={line.y}
      x2={line.x + line.width}
      y2={line.y + line.height}
      stroke={line.color}
      strokeWidth={Math.max(line.strokeWidth, 2)}
      strokeLinecap="round"
      opacity={line.opacity}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown?.(e, shape.id)}
    />
  );
}

/** Renders an Arrow (line + arrowhead) */
function ArrowRenderer({ shape, isSelected, onPointerDown }: ShapeRendererProps) {
  const arrow = shape as ArrowShape;
  const x1 = arrow.x;
  const y1 = arrow.y;
  const x2 = arrow.x + arrow.width;
  const y2 = arrow.y + arrow.height;

  // Arrowhead geometry
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12 + arrow.strokeWidth * 2;
  const ax = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const ay = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const bx = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const by = y2 - headLen * Math.sin(angle + Math.PI / 6);

  return (
    <g
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown?.(e, shape.id)}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={arrow.color}
        strokeWidth={Math.max(arrow.strokeWidth, 2)}
        strokeLinecap="round"
        opacity={arrow.opacity}
      />
      <polygon
        points={`${x2},${y2} ${ax},${ay} ${bx},${by}`}
        fill={arrow.color}
        opacity={arrow.opacity}
      />
    </g>
  );
}

/** Renders a Text shape */
function TextRenderer({ shape, isSelected, onPointerDown }: ShapeRendererProps) {
  const textShape = shape as TextShape;
  return (
    <g onPointerDown={(e) => onPointerDown?.(e, shape.id)} style={{ cursor: 'pointer' }}>
      {/* Background rect for selection targeting */}
      <rect
        x={textShape.x}
        y={textShape.y}
        width={Math.max(textShape.width, 20)}
        height={Math.max(textShape.height, textShape.fontSize + 8)}
        fill={textShape.fill !== 'transparent' ? textShape.fill : 'transparent'}
        stroke="none"
      />
      <text
        x={textShape.x + 4}
        y={textShape.y + textShape.fontSize}
        fill={textShape.color}
        fontSize={textShape.fontSize}
        fontFamily={textShape.fontFamily || 'Inter, system-ui, sans-serif'}
        opacity={textShape.opacity}
      >
        {textShape.text}
      </text>
    </g>
  );
}

// ── Main Shape Dispatcher ───────────────────────────────────

export function ShapeRenderer(props: ShapeRendererProps) {
  switch (props.shape.type) {
    case 'pen':
      return <PenRenderer {...props} />;
    case 'rectangle':
      return <RectRenderer {...props} />;
    case 'ellipse':
      return <EllipseRenderer {...props} />;
    case 'line':
      return <LineRenderer {...props} />;
    case 'arrow':
      return <ArrowRenderer {...props} />;
    case 'text':
      return <TextRenderer {...props} />;
    default:
      return null;
  }
}

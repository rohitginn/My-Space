// ============================================================
// Custom Canvas Engine - Rough.js Sketch Shape Renderers
// ============================================================

'use client';

import React, { useMemo } from 'react';
import rough from 'roughjs';
import type {
  CanvasShape, PenShape, RectangleShape, EllipseShape,
  LineShape, ArrowShape, TextShape, FillStyleType,
} from './types';
import { getShapeCenter, getStrokeDashArray } from './math';

// ── Rough.js Generator (singleton) ──────────────────────────

const rc = rough.generator();

interface ShapeRendererProps {
  shape: CanvasShape;
  isSelected: boolean;
  onPointerDown?: (e: React.PointerEvent, shapeId: string) => void;
}

// ── Rough Options Builder ───────────────────────────────────

function getRoughOptions(shape: CanvasShape) {
  const fillStyle = shape.fillStyle || 'none';
  const hasFill = fillStyle !== 'none' && shape.fill && shape.fill !== 'transparent';

  return {
    stroke: shape.color,
    strokeWidth: shape.strokeWidth,
    roughness: 1.2,
    bowing: 1,
    fill: hasFill ? shape.fill : undefined,
    fillStyle: hasFill ? (fillStyle as string) : undefined,
    fillWeight: shape.strokeWidth * 0.5,
    hachureAngle: -41,
    hachureGap: shape.strokeWidth * 3,
    strokeLineDash: shape.strokeStyle === 'dashed'
      ? [8, 4]
      : shape.strokeStyle === 'dotted'
        ? [2, 4]
        : undefined,
  };
}

// ── Rough Path Renderer (renders drawable.sets) ─────────────

function RoughPaths({ drawable, color, strokeWidth, opacity, strokeDash }: {
  drawable: any;
  color: string;
  strokeWidth: number;
  opacity: number;
  strokeDash?: string;
}) {
  return (
    <>
      {drawable.sets.map((set: any, idx: number) => {
        if (set.type === 'path') {
          // Outline strokes
          return (
            <path
              key={idx}
              d={set.ops.map((op: any) => {
                if (op.op === 'move') return `M ${op.data[0]} ${op.data[1]}`;
                if (op.op === 'bcurveTo')
                  return `C ${op.data[0]} ${op.data[1]}, ${op.data[2]} ${op.data[3]}, ${op.data[4]} ${op.data[5]}`;
                if (op.op === 'lineTo') return `L ${op.data[0]} ${op.data[1]}`;
                return '';
              }).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity={opacity}
              strokeDasharray={strokeDash}
            />
          );
        }
        if (set.type === 'fillPath') {
          // Hachure/cross-hatch fill lines
          return (
            <path
              key={idx}
              d={set.ops.map((op: any) => {
                if (op.op === 'move') return `M ${op.data[0]} ${op.data[1]}`;
                if (op.op === 'bcurveTo')
                  return `C ${op.data[0]} ${op.data[1]}, ${op.data[2]} ${op.data[3]}, ${op.data[4]} ${op.data[5]}`;
                if (op.op === 'lineTo') return `L ${op.data[0]} ${op.data[1]}`;
                return '';
              }).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth * 0.5}
              strokeLinecap="round"
              opacity={opacity * 0.7}
            />
          );
        }
        if (set.type === 'fillSketch') {
          return (
            <path
              key={idx}
              d={set.ops.map((op: any) => {
                if (op.op === 'move') return `M ${op.data[0]} ${op.data[1]}`;
                if (op.op === 'bcurveTo')
                  return `C ${op.data[0]} ${op.data[1]}, ${op.data[2]} ${op.data[3]}, ${op.data[4]} ${op.data[5]}`;
                if (op.op === 'lineTo') return `L ${op.data[0]} ${op.data[1]}`;
                return '';
              }).join(' ')}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth * 0.5}
              strokeLinecap="round"
              opacity={opacity * 0.6}
            />
          );
        }
        return null;
      })}
    </>
  );
}

// ── Shape Wrappers ──────────────────────────────────────────

function RotationWrapper({ shape, children, onPointerDown }: {
  shape: CanvasShape;
  children: React.ReactNode;
  onPointerDown?: (e: React.PointerEvent, shapeId: string) => void;
}) {
  const center = getShapeCenter(shape);
  const transform = shape.rotation !== 0
    ? `rotate(${shape.rotation} ${center.x} ${center.y})`
    : undefined;

  return (
    <g
      transform={transform}
      style={{ cursor: 'pointer' }}
      onPointerDown={(e) => onPointerDown?.(e, shape.id)}
    >
      {children}
    </g>
  );
}

// ── Individual Renderers ────────────────────────────────────

function PenRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const pen = shape as PenShape;
  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <path
        d={pen.pathData}
        fill="none"
        stroke={pen.color}
        strokeWidth={pen.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={pen.opacity}
        strokeDasharray={strokeDash}
      />
    </RotationWrapper>
  );
}

function RectRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const rect = shape as RectangleShape;
  const w = Math.abs(rect.width);
  const h = Math.abs(rect.height);

  const drawable = useMemo(() => {
    if (w < 1 || h < 1) return null;
    return rc.rectangle(rect.x, rect.y, w, h, getRoughOptions(shape));
  }, [rect.x, rect.y, w, h, shape.color, shape.strokeWidth, shape.fill, shape.fillStyle, shape.strokeStyle]);

  if (!drawable) return null;
  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  // If rounded corners, fall back to clean SVG rect
  if (rect.borderRadius > 0) {
    return (
      <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
        <rect
          x={rect.x}
          y={rect.y}
          width={w}
          height={h}
          rx={rect.borderRadius}
          ry={rect.borderRadius}
          fill={shape.fillStyle !== 'none' ? shape.fill : 'transparent'}
          stroke={rect.color}
          strokeWidth={rect.strokeWidth}
          opacity={rect.opacity}
          strokeDasharray={strokeDash}
        />
      </RotationWrapper>
    );
  }

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      {/* Invisible hit target for pointer events */}
      <rect
        x={rect.x}
        y={rect.y}
        width={w}
        height={h}
        fill="transparent"
        stroke="none"
        pointerEvents="fill"
      />
      <RoughPaths
        drawable={drawable}
        color={rect.color}
        strokeWidth={rect.strokeWidth}
        opacity={rect.opacity}
        strokeDash={strokeDash}
      />
    </RotationWrapper>
  );
}

function EllipseRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const ellipse = shape as EllipseShape;
  const w = Math.abs(ellipse.width);
  const h = Math.abs(ellipse.height);
  const cx = ellipse.x + w / 2;
  const cy = ellipse.y + h / 2;

  const drawable = useMemo(() => {
    if (w < 1 || h < 1) return null;
    return rc.ellipse(cx, cy, w, h, getRoughOptions(shape));
  }, [cx, cy, w, h, shape.color, shape.strokeWidth, shape.fill, shape.fillStyle, shape.strokeStyle]);

  if (!drawable) return null;
  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <ellipse cx={cx} cy={cy} rx={w / 2} ry={h / 2} fill="transparent" stroke="none" pointerEvents="fill" />
      <RoughPaths
        drawable={drawable}
        color={ellipse.color}
        strokeWidth={ellipse.strokeWidth}
        opacity={ellipse.opacity}
        strokeDash={strokeDash}
      />
    </RotationWrapper>
  );
}

function LineRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const line = shape as LineShape;
  const x2 = line.x + line.width;
  const y2 = line.y + line.height;

  const drawable = useMemo(() => {
    return rc.line(line.x, line.y, x2, y2, getRoughOptions(shape));
  }, [line.x, line.y, x2, y2, shape.color, shape.strokeWidth, shape.strokeStyle]);

  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      {/* Invisible wide line for easy selection */}
      <line x1={line.x} y1={line.y} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(12, line.strokeWidth + 8)} />
      <RoughPaths
        drawable={drawable}
        color={line.color}
        strokeWidth={Math.max(line.strokeWidth, 2)}
        opacity={line.opacity}
        strokeDash={strokeDash}
      />
    </RotationWrapper>
  );
}

function ArrowRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const arrow = shape as ArrowShape;
  const x1 = arrow.x;
  const y1 = arrow.y;
  const x2 = arrow.x + arrow.width;
  const y2 = arrow.y + arrow.height;

  const drawable = useMemo(() => {
    return rc.line(x1, y1, x2, y2, getRoughOptions(shape));
  }, [x1, y1, x2, y2, shape.color, shape.strokeWidth, shape.strokeStyle]);

  // Arrowhead geometry
  const angle = Math.atan2(y2 - y1, x2 - x1);
  const headLen = 12 + arrow.strokeWidth * 2;
  const ax = x2 - headLen * Math.cos(angle - Math.PI / 6);
  const ay = y2 - headLen * Math.sin(angle - Math.PI / 6);
  const bx = x2 - headLen * Math.cos(angle + Math.PI / 6);
  const by = y2 - headLen * Math.sin(angle + Math.PI / 6);

  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(12, arrow.strokeWidth + 8)} />
      <RoughPaths
        drawable={drawable}
        color={arrow.color}
        strokeWidth={Math.max(arrow.strokeWidth, 2)}
        opacity={arrow.opacity}
        strokeDash={strokeDash}
      />
      <polygon
        points={`${x2},${y2} ${ax},${ay} ${bx},${by}`}
        fill={arrow.color}
        opacity={arrow.opacity}
      />
    </RotationWrapper>
  );
}

function TextRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const textShape = shape as TextShape;

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <rect
        x={textShape.x}
        y={textShape.y}
        width={Math.max(textShape.width, 20)}
        height={Math.max(textShape.height, textShape.fontSize + 8)}
        fill={textShape.fillStyle !== 'none' && textShape.fill !== 'transparent' ? textShape.fill : 'transparent'}
        stroke="none"
        pointerEvents="fill"
      />
      <text
        x={textShape.x + 4}
        y={textShape.y + textShape.fontSize}
        fill={textShape.color}
        fontSize={textShape.fontSize}
        fontFamily={textShape.fontFamily || 'Inter, system-ui, sans-serif'}
        opacity={textShape.opacity}
        style={{ userSelect: 'none' }}
      >
        {textShape.text}
      </text>
    </RotationWrapper>
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

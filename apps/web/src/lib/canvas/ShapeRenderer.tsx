// ============================================================
// Custom Canvas Engine - Rough.js Sketch Shape Renderers
// ============================================================

'use client';

import React, { useMemo } from 'react';
import rough from 'roughjs';
import type {
  CanvasShape, PenShape, RectangleShape, EllipseShape,
  LineShape, ArrowShape, TextShape, FillStyleType, Point,
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
  const strokeDash = getStrokeDashArray(shape.strokeStyle);
  const options = getRoughOptions(shape);

  const headLen = 12 + arrow.strokeWidth * 2;
  const arrowHead = arrow.arrowHead || 'end';
  const arrowStyle = arrow.arrowStyle || 'straight';

  const { pathDrawable, startAngle, endAngle, startPt, endPt } = useMemo(() => {
    let pStart = { x: x1, y: y1 };
    let pEnd = { x: x2, y: y2 };
    let drawable;
    let sAngle = 0;
    let eAngle = 0;

    if (arrowStyle === 'elbow') {
      const midX = x2;
      const midY = y1;
      drawable = rc.linearPath([[x1, y1], [midX, midY], [x2, y2]], options);
      sAngle = Math.atan2(midY - y1, midX - x1);
      eAngle = Math.atan2(y2 - midY, x2 - midX);
    } else if (arrowStyle === 'curved') {
      const cx = (x1 + x2) / 2 - (y2 - y1) * 0.15;
      const cy = (y1 + y2) / 2 + (x2 - x1) * 0.15;
      drawable = rc.curve([[x1, y1], [cx, cy], [x2, y2]], options);
      sAngle = Math.atan2(cy - y1, cx - x1);
      eAngle = Math.atan2(y2 - cy, x2 - cx);
    } else {
      drawable = rc.line(x1, y1, x2, y2, options);
      sAngle = Math.atan2(y2 - y1, x2 - x1);
      eAngle = sAngle;
    }

    return { pathDrawable: drawable, startAngle: sAngle, endAngle: eAngle, startPt: pStart, endPt: pEnd };
  }, [x1, y1, x2, y2, arrowStyle, shape.color, shape.strokeWidth, shape.fill, shape.fillStyle, shape.strokeStyle]);

  const getArrowHeadPoints = (pt: Point, angle: number) => {
    const ax = pt.x - headLen * Math.cos(angle - Math.PI / 6);
    const ay = pt.y - headLen * Math.sin(angle - Math.PI / 6);
    const bx = pt.x - headLen * Math.cos(angle + Math.PI / 6);
    const by = pt.y - headLen * Math.sin(angle + Math.PI / 6);
    return `${pt.x},${pt.y} ${ax},${ay} ${bx},${by}`;
  };

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="transparent" strokeWidth={Math.max(12, arrow.strokeWidth + 8)} />
      <RoughPaths
        drawable={pathDrawable}
        color={arrow.color}
        strokeWidth={Math.max(arrow.strokeWidth, 2)}
        opacity={arrow.opacity}
        strokeDash={strokeDash}
      />
      {(arrowHead === 'start' || arrowHead === 'both') && (
        <polygon
          points={getArrowHeadPoints(startPt, startAngle + Math.PI)}
          fill={arrow.color}
          opacity={arrow.opacity}
        />
      )}
      {(arrowHead === 'end' || arrowHead === 'both') && (
        <polygon
          points={getArrowHeadPoints(endPt, endAngle)}
          fill={arrow.color}
          opacity={arrow.opacity}
        />
      )}
    </RotationWrapper>
  );
}

function TextRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const textShape = shape as TextShape;
  const w = Math.max(textShape.width, 20);
  const h = Math.max(textShape.height, textShape.fontSize + 8);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <rect
        x={textShape.x}
        y={textShape.y}
        width={w}
        height={h}
        fill={textShape.fillStyle !== 'none' && textShape.fill !== 'transparent' ? textShape.fill : 'transparent'}
        stroke="none"
        pointerEvents="fill"
      />
      <foreignObject
        x={textShape.x}
        y={textShape.y}
        width={w}
        height={h}
        style={{ pointerEvents: 'none' }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            color: textShape.color,
            fontSize: textShape.fontSize,
            fontFamily: textShape.fontFamily || 'Inter, system-ui, sans-serif',
            opacity: textShape.opacity,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflow: 'hidden',
            lineHeight: 1.2,
            padding: '2px 4px',
            userSelect: 'none',
          }}
        >
          {textShape.text}
        </div>
      </foreignObject>
    </RotationWrapper>
  );
}

function PolygonRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const rect = shape;
  const w = Math.abs(rect.width);
  const h = Math.abs(rect.height);

  const drawable = useMemo(() => {
    if (w < 1 || h < 1) return null;
    let points: [number, number][] = [];
    const x = rect.x;
    const y = rect.y;
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;

    switch (shape.type) {
      case 'diamond':
        points = [[x + w / 2, y], [x + w, y + h / 2], [x + w / 2, y + h], [x, y + h / 2]];
        break;
      case 'triangle':
        points = [[x + w / 2, y], [x + w, y + h], [x, y + h]];
        break;
      case 'star':
        const irx = rx * 0.4;
        const iry = ry * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (i * Math.PI) / 5 - Math.PI / 2;
          const rX = i % 2 === 0 ? rx : irx;
          const rY = i % 2 === 0 ? ry : iry;
          points.push([cx + rX * Math.cos(angle), cy + rY * Math.sin(angle)]);
        }
        break;
      case 'hexagon':
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3 - Math.PI / 2;
          points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
        }
        break;
      case 'parallelogram':
        points = [[x + w * 0.2, y], [x + w, y], [x + w * 0.8, y + h], [x, y + h]];
        break;
      case 'trapezoid':
        points = [[x + w * 0.2, y], [x + w * 0.8, y], [x + w, y + h], [x, y + h]];
        break;
      case 'callout':
        points = [
          [x, y],
          [x + w, y],
          [x + w, y + h * 0.8],
          [x + w * 0.45, y + h * 0.8],
          [x + w * 0.3, y + h],
          [x + w * 0.2, y + h * 0.8],
          [x, y + h * 0.8],
        ];
        break;
      default:
        break;
    }
    return rc.polygon(points, getRoughOptions(shape));
  }, [rect.x, rect.y, w, h, shape.type, shape.color, shape.strokeWidth, shape.fill, shape.fillStyle, shape.strokeStyle]);

  if (!drawable) return null;
  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <rect x={rect.x} y={rect.y} width={w} height={h} fill="transparent" stroke="none" pointerEvents="fill" />
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

function CylinderRenderer({ shape, onPointerDown }: ShapeRendererProps) {
  const rect = shape;
  const w = Math.abs(rect.width);
  const h = Math.abs(rect.height);

  const drawables = useMemo(() => {
    if (w < 1 || h < 1) return null;
    const x = rect.x;
    const y = rect.y;
    const cx = x + w / 2;
    const options = getRoughOptions(shape);
    const ellH = Math.min(h * 0.2, 40);

    const topEllipse = rc.ellipse(cx, y + ellH / 2, w, ellH, options);
    const bottomArc = rc.arc(cx, y + h - ellH / 2, w, ellH, 0, Math.PI, false, options);
    const leftLine = rc.line(x, y + ellH / 2, x, y + h - ellH / 2, options);
    const rightLine = rc.line(x + w, y + ellH / 2, x + w, y + h - ellH / 2, options);

    return [topEllipse, bottomArc, leftLine, rightLine];
  }, [rect.x, rect.y, w, h, shape.color, shape.strokeWidth, shape.fill, shape.fillStyle, shape.strokeStyle]);

  if (!drawables) return null;
  const strokeDash = getStrokeDashArray(shape.strokeStyle);

  return (
    <RotationWrapper shape={shape} onPointerDown={onPointerDown}>
      <rect x={rect.x} y={rect.y} width={w} height={h} fill="transparent" stroke="none" pointerEvents="fill" />
      {drawables.map((drawable, idx) => (
        <RoughPaths
          key={idx}
          drawable={drawable}
          color={rect.color}
          strokeWidth={rect.strokeWidth}
          opacity={rect.opacity}
          strokeDash={strokeDash}
        />
      ))}
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
    case 'diamond':
    case 'triangle':
    case 'star':
    case 'hexagon':
    case 'parallelogram':
    case 'trapezoid':
    case 'callout':
      return <PolygonRenderer {...props} />;
    case 'cylinder':
      return <CylinderRenderer {...props} />;
    default:
      return null;
  }
}

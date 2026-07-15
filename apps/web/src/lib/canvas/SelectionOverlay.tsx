// ============================================================
// Custom Canvas Engine - Selection Overlay with Rotation Handle
// ============================================================

import React from 'react';
import type { CanvasShape, HandlePosition } from './types';
import { getShapeBounds } from './math';
import type { AABB } from './types';

interface SelectionOverlayProps {
  shapes: CanvasShape[];
  onHandlePointerDown: (e: React.PointerEvent, handle: HandlePosition) => void;
}

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 30;

const HANDLE_POSITIONS: { pos: HandlePosition; getXY: (b: AABB) => { x: number; y: number } }[] = [
  { pos: 'nw', getXY: (b) => ({ x: b.minX, y: b.minY }) },
  { pos: 'n', getXY: (b) => ({ x: (b.minX + b.maxX) / 2, y: b.minY }) },
  { pos: 'ne', getXY: (b) => ({ x: b.maxX, y: b.minY }) },
  { pos: 'e', getXY: (b) => ({ x: b.maxX, y: (b.minY + b.maxY) / 2 }) },
  { pos: 'se', getXY: (b) => ({ x: b.maxX, y: b.maxY }) },
  { pos: 's', getXY: (b) => ({ x: (b.minX + b.maxX) / 2, y: b.maxY }) },
  { pos: 'sw', getXY: (b) => ({ x: b.minX, y: b.maxY }) },
  { pos: 'w', getXY: (b) => ({ x: b.minX, y: (b.minY + b.maxY) / 2 }) },
];

const CURSOR_MAP: Record<string, string> = {
  nw: 'nwse-resize',
  n: 'ns-resize',
  ne: 'nesw-resize',
  e: 'ew-resize',
  se: 'nwse-resize',
  s: 'ns-resize',
  sw: 'nesw-resize',
  w: 'ew-resize',
  rotation: 'grab',
};

export function SelectionOverlay({ shapes, onHandlePointerDown }: SelectionOverlayProps) {
  if (shapes.length === 0) return null;

  // Compute combined bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const shape of shapes) {
    const bounds = getShapeBounds(shape);
    if (bounds.minX < minX) minX = bounds.minX;
    if (bounds.minY < minY) minY = bounds.minY;
    if (bounds.maxX > maxX) maxX = bounds.maxX;
    if (bounds.maxY > maxY) maxY = bounds.maxY;
  }

  const box: AABB = { minX, minY, maxX, maxY };
  const w = maxX - minX;
  const h = maxY - minY;
  const half = HANDLE_SIZE / 2;
  const cx = (minX + maxX) / 2;

  return (
    <g className="selection-overlay">
      {/* Selection bounding rectangle */}
      <rect
        x={minX}
        y={minY}
        width={w}
        height={h}
        fill="transparent"
        stroke="#0ea5e9"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        pointerEvents="none"
        style={{ vectorEffect: 'non-scaling-stroke' }}
      />

      {/* Rotation handle connector line */}
      <line
        x1={cx}
        y1={minY}
        x2={cx}
        y2={minY - ROTATION_HANDLE_OFFSET}
        stroke="#0ea5e9"
        strokeWidth={1}
        strokeDasharray="3 2"
        pointerEvents="none"
        style={{ vectorEffect: 'non-scaling-stroke' }}
      />

      {/* Rotation handle circle */}
      <circle
        cx={cx}
        cy={minY - ROTATION_HANDLE_OFFSET}
        r={5}
        fill="#ffffff"
        stroke="#0ea5e9"
        strokeWidth={1.5}
        style={{
          cursor: 'grab',
          vectorEffect: 'non-scaling-stroke',
        }}
        onPointerDown={(e) => {
          e.stopPropagation();
          onHandlePointerDown(e, 'rotation');
        }}
      />

      {/* Resize handles */}
      {HANDLE_POSITIONS.map(({ pos, getXY }) => {
        const { x, y } = getXY(box);
        return (
          <rect
            key={pos}
            x={x - half}
            y={y - half}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={2}
            fill="#ffffff"
            stroke="#0ea5e9"
            strokeWidth={1.5}
            style={{
              cursor: CURSOR_MAP[pos],
              vectorEffect: 'non-scaling-stroke',
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              onHandlePointerDown(e, pos);
            }}
          />
        );
      })}
    </g>
  );
}

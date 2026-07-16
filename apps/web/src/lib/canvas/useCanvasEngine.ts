// ============================================================
// Custom Infinite Canvas Engine - State Management Hook
// ============================================================

import { useReducer, useCallback, useRef } from 'react';
import type {
  Camera, CanvasShape, ToolType, ToolStyle,
  CanvasDocument, HandlePosition, PenShape,
} from './types';
import { pointsToSmoothPath } from './math';

// ── State ───────────────────────────────────────────────────

export interface CanvasEngineState {
  camera: Camera;
  shapes: Record<string, CanvasShape>;
  selectedIds: string[];
  activeTool: ToolType;
  toolStyle: ToolStyle;
  isDrawing: boolean;
  isPanning: boolean;
  isDragging: boolean;
  isResizing: boolean;
  isRotating: boolean;
  activeHandle: HandlePosition | null;
}

const DEFAULT_TOOL_STYLE: ToolStyle = {
  color: '#0ea5e9',
  strokeWidth: 2,
  strokeStyle: 'solid',
  fill: 'transparent',
  fillStyle: 'none',
  opacity: 1,
  fontSize: 16,
  borderRadius: 0,
};

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

function createInitialState(doc?: CanvasDocument): CanvasEngineState {
  return {
    camera: doc?.camera ?? DEFAULT_CAMERA,
    shapes: doc?.shapes ?? {},
    selectedIds: [],
    activeTool: 'select',
    toolStyle: { ...DEFAULT_TOOL_STYLE },
    isDrawing: false,
    isPanning: false,
    isDragging: false,
    isResizing: false,
    isRotating: false,
    activeHandle: null,
  };
}

// ── Actions ─────────────────────────────────────────────────

type Action =
  | { type: 'SET_CAMERA'; camera: Camera }
  | { type: 'SET_TOOL'; tool: ToolType }
  | { type: 'SET_TOOL_STYLE'; style: Partial<ToolStyle> }
  | { type: 'ADD_SHAPE'; shape: CanvasShape }
  | { type: 'UPDATE_SHAPE'; id: string; changes: Partial<CanvasShape> }
  | { type: 'DELETE_SHAPES'; ids: string[] }
  | { type: 'SET_SELECTED'; ids: string[] }
  | { type: 'SET_DRAWING'; value: boolean }
  | { type: 'SET_PANNING'; value: boolean }
  | { type: 'SET_DRAGGING'; value: boolean }
  | { type: 'SET_RESIZING'; value: boolean; handle?: HandlePosition | null }
  | { type: 'SET_ROTATING'; value: boolean }
  | { type: 'MOVE_SHAPES'; ids: string[]; dx: number; dy: number }
  | { type: 'BRING_TO_FRONT'; ids: string[] }
  | { type: 'SEND_TO_BACK'; ids: string[] }
  | { type: 'LOAD_DOCUMENT'; doc: CanvasDocument }
  | { type: 'RESTORE_SHAPES'; shapes: Record<string, CanvasShape> };

// ── Reducer ─────────────────────────────────────────────────

function canvasReducer(state: CanvasEngineState, action: Action): CanvasEngineState {
  switch (action.type) {
    case 'SET_CAMERA':
      return { ...state, camera: action.camera };

    case 'SET_TOOL':
      return { ...state, activeTool: action.tool, selectedIds: action.tool !== 'select' ? [] : state.selectedIds };

    case 'SET_TOOL_STYLE':
      return { ...state, toolStyle: { ...state.toolStyle, ...action.style } };

    case 'ADD_SHAPE': {
      const newShapes = { ...state.shapes, [action.shape.id]: action.shape };
      return { ...state, shapes: newShapes };
    }

    case 'UPDATE_SHAPE': {
      const existing = state.shapes[action.id];
      if (!existing) return state;
      const updated = { ...existing, ...action.changes } as CanvasShape;
      return { ...state, shapes: { ...state.shapes, [action.id]: updated } };
    }

    case 'DELETE_SHAPES': {
      const newShapes = { ...state.shapes };
      for (const id of action.ids) {
        delete newShapes[id];
      }
      return {
        ...state,
        shapes: newShapes,
        selectedIds: state.selectedIds.filter(id => !action.ids.includes(id)),
      };
    }

    case 'SET_SELECTED':
      return { ...state, selectedIds: action.ids };

    case 'SET_DRAWING':
      return { ...state, isDrawing: action.value };

    case 'SET_PANNING':
      return { ...state, isPanning: action.value };

    case 'SET_DRAGGING':
      return { ...state, isDragging: action.value };

    case 'SET_RESIZING':
      return { ...state, isResizing: action.value, activeHandle: action.handle ?? null };

    case 'SET_ROTATING':
      return { ...state, isRotating: action.value };

    case 'MOVE_SHAPES': {
      const newShapes = { ...state.shapes };
      for (const id of action.ids) {
        const shape = newShapes[id];
        if (shape) {
          if (shape.type === 'pen') {
            const pen = shape as PenShape;
            const newPoints = pen.points.map(p => ({ x: p.x + action.dx, y: p.y + action.dy }));
            newShapes[id] = {
              ...pen,
              x: pen.x + action.dx,
              y: pen.y + action.dy,
              points: newPoints,
              pathData: pointsToSmoothPath(newPoints),
            } as CanvasShape;
          } else {
            newShapes[id] = { ...shape, x: shape.x + action.dx, y: shape.y + action.dy } as CanvasShape;
          }
        }
      }
      return { ...state, shapes: newShapes };
    }

    case 'BRING_TO_FRONT': {
      const allShapes = Object.values(state.shapes);
      const maxZ = allShapes.reduce((max, s) => Math.max(max, s.zIndex), 0);
      const newShapes = { ...state.shapes };
      let offset = 1;
      for (const id of action.ids) {
        if (newShapes[id]) {
          newShapes[id] = { ...newShapes[id], zIndex: maxZ + offset } as CanvasShape;
          offset++;
        }
      }
      return { ...state, shapes: newShapes };
    }

    case 'SEND_TO_BACK': {
      const allShapes = Object.values(state.shapes);
      const minZ = allShapes.reduce((min, s) => Math.min(min, s.zIndex), 0);
      const newShapes = { ...state.shapes };
      let offset = 1;
      for (const id of action.ids) {
        if (newShapes[id]) {
          newShapes[id] = { ...newShapes[id], zIndex: minZ - offset } as CanvasShape;
          offset++;
        }
      }
      return { ...state, shapes: newShapes };
    }

    case 'LOAD_DOCUMENT':
      return {
        ...state,
        shapes: action.doc.shapes ?? {},
        camera: action.doc.camera ?? DEFAULT_CAMERA,
        selectedIds: [],
      };

    case 'RESTORE_SHAPES':
      return { ...state, shapes: action.shapes };

    default:
      return state;
  }
}

// ── Hook ────────────────────────────────────────────────────

export function useCanvasEngine(initialDoc?: CanvasDocument) {
  const [state, dispatch] = useReducer(canvasReducer, initialDoc, createInitialState);

  // Undo/Redo history stack
  const historyRef = useRef<{ shapes: Record<string, CanvasShape> }[]>([]);
  const historyIndexRef = useRef(-1);

  const pushHistory = useCallback(() => {
    const snapshot = JSON.parse(JSON.stringify(state.shapes));
    historyRef.current = historyRef.current.slice(0, historyIndexRef.current + 1);
    historyRef.current.push({ shapes: snapshot });
    historyIndexRef.current = historyRef.current.length - 1;

    if (historyRef.current.length > 100) {
      historyRef.current.shift();
      historyIndexRef.current--;
    }
  }, [state.shapes]);

  const undo = useCallback(() => {
    if (historyIndexRef.current <= 0) return;
    historyIndexRef.current--;
    const prev = historyRef.current[historyIndexRef.current];
    if (prev) {
      dispatch({ type: 'RESTORE_SHAPES', shapes: JSON.parse(JSON.stringify(prev.shapes)) });
    }
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current++;
    const next = historyRef.current[historyIndexRef.current];
    if (next) {
      dispatch({ type: 'RESTORE_SHAPES', shapes: JSON.parse(JSON.stringify(next.shapes)) });
    }
  }, []);

  // Convenience dispatchers
  const setCamera = useCallback((camera: Camera) => dispatch({ type: 'SET_CAMERA', camera }), []);
  const setTool = useCallback((tool: ToolType) => dispatch({ type: 'SET_TOOL', tool }), []);
  const setToolStyle = useCallback((style: Partial<ToolStyle>) => dispatch({ type: 'SET_TOOL_STYLE', style }), []);
  const addShape = useCallback((shape: CanvasShape) => dispatch({ type: 'ADD_SHAPE', shape }), []);
  const updateShape = useCallback((id: string, changes: Partial<CanvasShape>) => dispatch({ type: 'UPDATE_SHAPE', id, changes }), []);
  const deleteShapes = useCallback((ids: string[]) => dispatch({ type: 'DELETE_SHAPES', ids }), []);
  const setSelected = useCallback((ids: string[]) => dispatch({ type: 'SET_SELECTED', ids }), []);
  const setDrawing = useCallback((v: boolean) => dispatch({ type: 'SET_DRAWING', value: v }), []);
  const setPanning = useCallback((v: boolean) => dispatch({ type: 'SET_PANNING', value: v }), []);
  const setDragging = useCallback((v: boolean) => dispatch({ type: 'SET_DRAGGING', value: v }), []);
  const setResizing = useCallback((v: boolean, handle?: HandlePosition | null) => dispatch({ type: 'SET_RESIZING', value: v, handle }), []);
  const setRotating = useCallback((v: boolean) => dispatch({ type: 'SET_ROTATING', value: v }), []);
  const moveShapes = useCallback((ids: string[], dx: number, dy: number) => dispatch({ type: 'MOVE_SHAPES', ids, dx, dy }), []);
  const bringToFront = useCallback((ids: string[]) => dispatch({ type: 'BRING_TO_FRONT', ids }), []);
  const sendToBack = useCallback((ids: string[]) => dispatch({ type: 'SEND_TO_BACK', ids }), []);
  const loadDocument = useCallback((doc: CanvasDocument) => dispatch({ type: 'LOAD_DOCUMENT', doc }), []);

  /** Get the current document state for serialization/autosave */
  const getDocument = useCallback((): CanvasDocument => {
    return { shapes: state.shapes, camera: state.camera };
  }, [state.shapes, state.camera]);

  return {
    state,
    dispatch,
    setCamera,
    setTool,
    setToolStyle,
    addShape,
    updateShape,
    deleteShapes,
    moveShapes,
    bringToFront,
    sendToBack,
    setSelected,
    setDrawing,
    setPanning,
    setDragging,
    setResizing,
    setRotating,
    pushHistory,
    undo,
    redo,
    loadDocument,
    getDocument,
  };
}

export type CanvasEngine = ReturnType<typeof useCanvasEngine>;

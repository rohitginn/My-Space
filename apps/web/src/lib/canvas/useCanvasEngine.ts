'use client';

import { useState, useSyncExternalStore } from 'react';
import { CanvasEditor } from './editor';
import type { CanvasDocument, CanvasShape, HandlePosition, ToolStyle, ToolType } from './types';

/**
 * React adapter for the framework-agnostic editor. Components consume a
 * snapshot; mutations are routed through CanvasEditor so history, migration,
 * bindings and persistence all share one transaction boundary.
 */
export function useCanvasEngine(initialDoc?: CanvasDocument) {
  const [editor] = useState(() => new CanvasEditor(initialDoc));
  const state = useSyncExternalStore(editor.subscribe, editor.getSnapshot, editor.getSnapshot);

  return {
    state,
    editor,
    setCamera: editor.setCamera,
    setTool: editor.setTool,
    setToolStyle: editor.setToolStyle,
    addShape: editor.addShape,
    createAsset: editor.createAsset,
    deleteAsset: editor.deleteAsset,
    pruneUnusedAssets: editor.pruneUnusedAssets,
    updateShape: editor.updateShape,
    updateShapes: editor.updateShapes,
    deleteShapes: editor.deleteShapes,
    moveShapes: editor.moveShapes,
    moveShapesWithSnapping: editor.moveShapesWithSnapping,
    alignShapes: editor.alignShapes,
    distributeShapes: editor.distributeShapes,
    rotateShapesBy: editor.rotateShapesBy,
    bringToFront: editor.bringToFront,
    sendToBack: editor.sendToBack,
    lockShapes: editor.lockShapes,
    group: editor.group,
    ungroup: editor.ungroup,
    createBinding: editor.createBinding,
    createPage: editor.createPage,
    duplicatePage: editor.duplicatePage,
    switchPage: editor.switchPage,
    renamePage: editor.renamePage,
    reorderPage: editor.reorderPage,
    deletePage: editor.deletePage,
    setPreferences: editor.setPreferences,
    setSelected: editor.setSelected,
    setHovered: editor.setHovered,
    selectAll: editor.selectAll,
    selectNone: editor.selectNone,
    getShape: editor.getShape,
    getSelectedShapes: editor.getSelectedShapes,
    getCurrentPageShapes: editor.getCurrentPageShapes,
    getHierarchyIds: editor.getHierarchyIds,
    startEditing: editor.startEditing,
    stopEditing: editor.stopEditing,
    zoomIn: editor.zoomIn,
    zoomOut: editor.zoomOut,
    resetZoom: editor.resetZoom,
    setDrawing: (value: boolean) => editor.setInteraction('isDrawing', value),
    setPanning: (value: boolean) => editor.setInteraction('isPanning', value),
    setDragging: (value: boolean) => editor.setInteraction('isDragging', value),
    setResizing: (value: boolean, handle?: HandlePosition | null) => editor.setInteraction('isResizing', value, handle),
    setRotating: (value: boolean) => editor.setInteraction('isRotating', value),
    pushHistory: editor.pushHistory,
    run: editor.run,
    undo: editor.undo,
    redo: editor.redo,
    loadDocument: editor.loadDocument,
    clearCanvas: editor.clearCanvas,
    getDocument: editor.getDocument,
    dispatch: () => undefined,
  };
}

export type CanvasEngine = ReturnType<typeof useCanvasEngine>;
export type CanvasEngineState = CanvasEngine['state'];
export type CanvasEngineActions = Pick<CanvasEngine, 'setCamera' | 'setTool' | 'setToolStyle' | 'addShape' | 'updateShape' | 'deleteShapes' | 'setSelected'>;

export type { CanvasDocument, CanvasShape, ToolStyle, ToolType };

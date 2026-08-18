import { and, eq } from 'drizzle-orm';
import * as Y from 'yjs';

import { db } from '../../config/db.js';
import { collaborationDocuments } from '../../db/schema/collaboration.js';
import { coCanvases } from '../../db/schema/co-canvases.js';
import { notes } from '../../db/schema/notes.js';
import { AppError } from '../../utils/AppError.js';
import { getMembership } from '../workspaces/workspaces.service.js';

export type CollaborationResourceType = 'canvas' | 'note';
export type CollaborationResource = {
  workspaceId: string;
  resourceId: string;
  resourceType: CollaborationResourceType;
};

type CanvasSnapshot = {
  version?: number;
  pages?: Record<string, unknown>;
  currentPageId?: string;
  assets?: Record<string, unknown>;
  bindings?: Record<string, unknown>;
  settings?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  shapes: Record<string, unknown>;
  camera: Record<string, unknown>;
};

type NoteSnapshot = { title: string; content: string };

type CachedDocument = {
  key: string;
  resource: CollaborationResource;
  doc: Y.Doc;
  revision: number;
  references: number;
  persistTimer?: NodeJS.Timeout;
  cleanupTimer?: NodeJS.Timeout;
};

const documents = new Map<string, CachedDocument>();
const DOCUMENT_IDLE_MS = 5 * 60 * 1000;

function keyFor(resource: CollaborationResource) {
  return `${resource.resourceType}:${resource.workspaceId}:${resource.resourceId}`;
}

function getJsonMap(root: Y.Map<unknown>, name: string) {
  let map = root.get(name) as Y.Map<string> | undefined;
  if (!map) {
    map = new Y.Map<string>();
    root.set(name, map);
  }
  return map;
}

function replaceJsonMap(root: Y.Map<unknown>, name: string, values: Record<string, unknown>) {
  const map = getJsonMap(root, name);
  for (const key of Array.from(map.keys())) {
    if (!(key in values)) map.delete(key);
  }
  for (const [key, value] of Object.entries(values)) map.set(key, JSON.stringify(value));
}

function readJsonMap(root: Y.Map<unknown>, name: string) {
  const map = root.get(name) as Y.Map<string> | undefined;
  if (!map) return {};
  return Object.fromEntries(Array.from(map.entries()).flatMap(([key, value]) => {
    try {
      return [[key, JSON.parse(value)]] as const;
    } catch {
      return [];
    }
  }));
}

function writeCanvasSnapshot(doc: Y.Doc, input: Partial<CanvasSnapshot>) {
  const root = doc.getMap<unknown>('canvas');
  doc.transact(() => {
    replaceJsonMap(root, 'shapes', input.shapes ?? {});
    replaceJsonMap(root, 'pages', input.pages ?? {});
    replaceJsonMap(root, 'assets', input.assets ?? {});
    replaceJsonMap(root, 'bindings', input.bindings ?? {});
    root.set('version', input.version ?? 2);
    root.set('currentPageId', input.currentPageId ?? 'page:default');
    root.set('settings', JSON.stringify(input.settings ?? {}));
    root.set('metadata', JSON.stringify(input.metadata ?? {}));
    root.set('camera', JSON.stringify(input.camera ?? { x: 0, y: 0, zoom: 1 }));
  }, 'projection');
}

function readCanvasSnapshot(doc: Y.Doc): CanvasSnapshot {
  const root = doc.getMap<unknown>('canvas');
  const parse = <T>(name: string, fallback: T) => {
    const value = root.get(name);
    if (typeof value !== 'string') return fallback;
    try {
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  };
  return {
    version: Number(root.get('version') ?? 2),
    pages: readJsonMap(root, 'pages'),
    currentPageId: String(root.get('currentPageId') ?? 'page:default'),
    assets: readJsonMap(root, 'assets'),
    bindings: readJsonMap(root, 'bindings'),
    settings: parse('settings', {}),
    metadata: parse('metadata', {}),
    shapes: readJsonMap(root, 'shapes'),
    camera: parse('camera', { x: 0, y: 0, zoom: 1 }),
  };
}

function writeNoteSnapshot(doc: Y.Doc, input: NoteSnapshot) {
  doc.transact(() => {
    const title = doc.getText('title');
    const content = doc.getText('content');
    if (title.length > 0) title.delete(0, title.length);
    if (content.length > 0) content.delete(0, content.length);
    if (input.title) title.insert(0, input.title);
    if (input.content) content.insert(0, input.content);
  }, 'projection');
}

function readNoteSnapshot(doc: Y.Doc): NoteSnapshot {
  return { title: doc.getText('title').toString(), content: doc.getText('content').toString() };
}

async function loadProjection(resource: CollaborationResource) {
  if (resource.resourceType === 'canvas') {
    const canvas = await db.query.coCanvases.findFirst({ where: and(eq(coCanvases.id, resource.resourceId), eq(coCanvases.workspaceId, resource.workspaceId)) });
    if (!canvas) throw new AppError('Co-Canvas not found', 404, 'CO_CANVAS_NOT_FOUND');
    return canvas.documentData as CanvasSnapshot;
  }
  const note = await db.query.notes.findFirst({ where: and(eq(notes.id, resource.resourceId), eq(notes.workspaceId, resource.workspaceId), eq(notes.isTrashed, false)) });
  if (!note) throw new AppError('Workspace note not found', 404, 'WORKSPACE_NOTE_NOT_FOUND');
  return { title: note.title, content: note.content ?? '' } satisfies NoteSnapshot;
}

export async function authorizeResource(userId: string, resource: CollaborationResource, write = false) {
  const membership = await getMembership(userId, resource.workspaceId);
  if (write && membership.role === 'viewer') throw new AppError('Workspace is read-only for this member', 403, 'WORKSPACE_READ_ONLY');
  await loadProjection(resource);
  return membership;
}

async function persistDocument(entry: CachedDocument) {
  const state = Buffer.from(Y.encodeStateAsUpdate(entry.doc)).toString('base64');
  await db.insert(collaborationDocuments).values({
    workspaceId: entry.resource.workspaceId,
    resourceType: entry.resource.resourceType,
    resourceId: entry.resource.resourceId,
    state,
    revision: entry.revision,
    updatedAt: new Date(),
  }).onConflictDoUpdate({
    target: [collaborationDocuments.workspaceId, collaborationDocuments.resourceType, collaborationDocuments.resourceId],
    set: { state, revision: entry.revision, updatedAt: new Date() },
  });

  if (entry.resource.resourceType === 'canvas') {
    await db.update(coCanvases).set({ documentData: readCanvasSnapshot(entry.doc), updatedAt: new Date() }).where(eq(coCanvases.id, entry.resource.resourceId));
  } else {
    const snapshot = readNoteSnapshot(entry.doc);
    await db.update(notes).set({ title: snapshot.title || 'Untitled', content: snapshot.content, updatedAt: new Date() }).where(eq(notes.id, entry.resource.resourceId));
  }
}

function schedulePersist(entry: CachedDocument) {
  if (entry.persistTimer) clearTimeout(entry.persistTimer);
  entry.persistTimer = setTimeout(() => {
    entry.persistTimer = undefined;
    void persistDocument(entry).catch(() => undefined);
  }, 500);
}

function scheduleCleanup(entry: CachedDocument) {
  if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer);
  entry.cleanupTimer = setTimeout(() => {
    if (entry.references > 0) return;
    if (entry.persistTimer) clearTimeout(entry.persistTimer);
    documents.delete(entry.key);
  }, DOCUMENT_IDLE_MS);
}

export async function joinResource(userId: string, resource: CollaborationResource) {
  await authorizeResource(userId, resource);
  const key = keyFor(resource);
  let entry = documents.get(key);
  if (!entry) {
    entry = {
      key,
      resource,
      doc: new Y.Doc(),
      revision: 0,
      references: 0,
    };
    const stored = await db.query.collaborationDocuments.findFirst({ where: and(
      eq(collaborationDocuments.workspaceId, resource.workspaceId),
      eq(collaborationDocuments.resourceType, resource.resourceType),
      eq(collaborationDocuments.resourceId, resource.resourceId),
    ) });
    if (stored) {
      Y.applyUpdate(entry.doc, Buffer.from(stored.state, 'base64'), 'restore');
      entry.revision = stored.revision;
    } else {
      const projection = await loadProjection(resource);
      if (resource.resourceType === 'canvas') writeCanvasSnapshot(entry.doc, projection as CanvasSnapshot);
      else writeNoteSnapshot(entry.doc, projection as NoteSnapshot);
    }
    documents.set(key, entry);
  }
  entry.references += 1;
  if (entry.cleanupTimer) clearTimeout(entry.cleanupTimer);
  return { key, state: Buffer.from(Y.encodeStateAsUpdate(entry.doc)).toString('base64'), revision: entry.revision };
}

export async function applyResourceUpdate(userId: string, resource: CollaborationResource, encodedUpdate: string) {
  await authorizeResource(userId, resource, true);
  const entry = documents.get(keyFor(resource));
  if (!entry) throw new AppError('Collaboration room is not joined', 409, 'COLLABORATION_NOT_JOINED');
  Y.applyUpdate(entry.doc, Buffer.from(encodedUpdate, 'base64'), userId);
  entry.revision += 1;
  schedulePersist(entry);
  return { revision: entry.revision };
}

export async function leaveResource(resource: CollaborationResource) {
  const entry = documents.get(keyFor(resource));
  if (!entry) return;
  entry.references = Math.max(0, entry.references - 1);
  if (entry.references === 0) {
    if (entry.persistTimer) {
      clearTimeout(entry.persistTimer);
      entry.persistTimer = undefined;
      void persistDocument(entry).catch(() => undefined);
    }
    scheduleCleanup(entry);
  }
}

export function getResourceKey(resource: CollaborationResource) {
  return keyFor(resource);
}

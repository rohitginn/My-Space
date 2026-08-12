# MySpace Canvas Editor Architecture

This document records the independent editor architecture implemented from the
tldraw research brief. It is intentionally a behavior and boundary document,
not a copy of tldraw internals.

## Research notes

| Subsystem | Evidence | Decision |
| --- | --- | --- |
| Store | tldraw Store documentation | Use versioned JSON records with immutable-style updates and a single editor boundary. |
| Shapes | tldraw Shapes and Geometry documentation | Shape definitions own rendering-adjacent geometry, hit testing, and transform behavior. |
| Tools | tldraw Tools / StateNode documentation | Treat tools as explicit modes with interaction phases rather than one global pointer handler. |
| Persistence | tldraw Persistence documentation | Persist document records separately from session camera, selection, and active tool. |
| History | tldraw Editor and History documentation | User operations are grouped into transactions and undo stopping points. |
| Bindings | tldraw Bindings documentation | Arrows store relationships to shape IDs and recompute endpoints when targets move. |
| Rich text | tldraw Rich Text documentation | Store structured rich text JSON instead of HTML or a plain text-only shape. |

## Architecture map

```text
Canvas UI
  -> CanvasEditor React adapter
  -> CanvasEditor transaction API
  -> tool / pointer interaction states
  -> normalized document records
  -> shape geometry and binding services
  -> SVG scene and HTML editing overlays
```

React owns toolbar, menus, comments, overlays, and responsive chrome. The
editor owns document mutations, selection, camera, history, pages, hierarchy,
bindings, and session state. The API/socket adapter only serializes document
changes and presence; it does not mutate shapes directly.

## Records

- `CanvasDocument`: version, pages, shapes, assets, bindings, settings, and metadata.
- `PageRecord`: page identity, name, order, and page-local scene membership.
- `CanvasShape`: stable identity, page/parent identity, ordering, transform, lock state, style, and type-specific props.
- `AssetRecord`: source URL and media metadata, kept separate from placement shapes.
- `BindingRecord`: directional arrow-to-shape relationship plus normalized anchor.
- `EditorSessionState`: camera, active page, selection, hover/edit state, active tool, and user preferences.

The persisted API payload remains JSON-compatible. Legacy `{ shapes, camera }`
documents are migrated to version 2 on load and saved back in normalized form.

## Coordinate model

- Screen space: browser client coordinates from pointer events.
- Viewport space: coordinates relative to the canvas container.
- Page space: persistent coordinates used by every shape and binding.

`screenToWorld` and `worldToScreen` are the only conversion boundary for
pointer interactions. Camera pan and zoom never rewrite shape positions.

## Shape and geometry model

The shape registry is exposed through the canvas module and geometry is kept
independent from SVG. `getGeometry` provides bounds, center, vertices,
containment, and distance. Hit testing sorts by explicit z-order and protects
locked shapes. Rotated bounds are calculated from rotated corners and inverse
rotation is applied before shape-specific hit testing.

The current practical family includes rectangles, ellipses, polygons, lines,
arrows, freehand pen/highlighter strokes, text, sticky notes, cylinders,
callouts, frames, image/video/media placeholders, octagons, and clouds.
The base record already carries page, parent, lock, index, props, and metadata
fields so new shapes do not require changing the editor state model.

`shapeRegistry.ts` owns creation defaults and shape metadata so adding a shape
does not require another creation branch in the canvas component.

## Interaction state

The canvas retains separate interaction flags for compatibility with the
current renderer, while the editor API exposes explicit operations for each
phase:

```text
select idle -> pointing shape -> dragging
select idle -> pointing canvas -> marquee
select idle -> pointing handle -> resizing / rotating
draw idle -> drawing -> completed
text idle -> editing overlay -> committed / cancelled
hand idle -> panning -> idle
eraser idle -> erasing -> completed
```

The React surface may render these states, but document mutations go through
`run`, `createShapes`, `updateShapes`, `deleteShapes`, and related editor APIs.

## Transactions and history

`CanvasEditor.run` captures a document snapshot at the start of a logical
operation. Nested updates are grouped. A completed transaction creates one
history stopping point, while `{ history: 'ignore' }` supports camera/session
or preview work. The compatibility `pushHistory` method remains available to
the current interaction surface while new features use `run` directly.

## Pages, hierarchy, and bindings

Shapes carry `pageId` and `parentId`. Groups use a parent shape and preserve
child identity. Pages are independent scene filters. Bindings are removed when
either endpoint is deleted; moving a bound shape recomputes arrow endpoints
from normalized target anchors.

Grid and object snapping are applied inside editor movement operations. Align
and distribute actions are editor transactions, so each produces one undoable
operation rather than a history entry per shape.

## Persistence and collaboration

The server stores the document snapshot in the existing JSONB fields. Camera
is retained in the payload for backward compatibility, while current tool,
selection, hover, and editing state remain local. Existing socket events for
snapshot updates, cursors, presence, and comments remain separate channels.

The browser writes completed document changes to IndexedDB under a
canvas-specific key and keeps a coalesced outbox entry for edits made while a
save or socket connection is unavailable. JSON export/import and image/video
import are available from the editor chrome. Imported media is stored as asset
records and referenced by placement shapes; bookmark and embed shapes collect
their URL through an inline editor. The current local-first implementation uses
data URLs for local media until a server attachment endpoint is introduced.

## Extension guide

To add a shape: extend `ShapeType`, add a record interface, add renderer and
geometry behavior, then register creation and toolbar metadata. To add a tool,
add a `ToolType`, define its pointer/key transitions, and route document changes
through `CanvasEditor.run`. To add a binding or asset, create a versioned record
and add lifecycle cleanup in the editor rather than embedding it in a React
component.

## Verification targets

Geometry, migration, store transactions, undo/redo, pages, locked shapes,
bindings, selection, camera conversion, rich-text serialization, and export
bounds are unit-test targets. Browser acceptance covers creation, transforms,
editing, persistence, shortcuts, collaboration presence, and responsive input.

## Current boundaries

- Grouping uses a group boundary record and keeps child movement, rotation, resize, and deletion hierarchical. Frames clip nested children and participate in the same transform path; nested transform matrices and frame-specific custom handles are intentionally outside this first implementation.
- Rich text is stored as structured JSON and supports contenteditable inline editing with bold, italic, highlight, code, links, and ordered/unordered lists. Selection-preserving history for browser-native editing remains a browser acceptance concern.
- Arrow bindings use normalized anchors selected from shape connection points, automatic proximity binding on draw, selectable endpoints, and straight/curved/elbow routes. Obstacle avoidance and binding preview affordances remain future work.
- Local persistence uses IndexedDB for document snapshots and a coalesced outbox. Media is garbage-collected when its last placement shape is deleted. A production attachment service and remote thumbnail/video metadata remain future work.
- Collaboration remains snapshot-based, but the socket room now assigns monotonic revisions and sends the latest room snapshot to late joiners. It does not yet provide operation-level conflict resolution, presence-aware undo, or semantic offline merge.
- The scene renderer performs viewport culling and freehand updates are batched through requestAnimationFrame; a spatial index and fine-grained record subscriptions are still future performance work for very large documents.

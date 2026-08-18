# Canvas data model

The persisted `CanvasDocument` is versioned and JSON-safe. It contains pages,
shape records, asset metadata, bindings, settings, document metadata, and a
backward-compatible camera field. Session-only state contains the active tool,
selection, hover/edit state, preferences, and interaction flags.

## Records

- `PageRecord`: stable page ID, name, order, and page camera.
- `CanvasShape`: stable ID, type, page/parent IDs, transform, style, z-order,
  lock state, props, and metadata.
- `AssetRecord`: media source and metadata, separate from placement geometry.
- `BindingRecord`: arrow endpoint relationship with normalized target anchor.
- `RichTextDocument`: structured block and inline mark tree.

Legacy flat `{ shapes, camera }` payloads are normalized on load by
`migrateDocument`; the editor serializes the normalized version on save.

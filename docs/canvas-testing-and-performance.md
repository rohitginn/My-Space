# Canvas testing and performance

Automated coverage currently verifies migration, geometry, rich-text marks and
lists, transactions, undo/redo, locked shapes, page independence and cameras,
bindings, groups, asset cleanup, and motion utilities. The browser acceptance
path should still be exercised manually for pointer fidelity, media playback,
bookmark/embed URL entry, contenteditable selection, and responsive touch
targets.

The scene filters shapes against the camera viewport before rendering. Freehand
preview updates are batched through `requestAnimationFrame`, persistence is
debounced by the host editor, and geometry is kept independent from rendering.
For very large documents, a spatial index, fine-grained record subscriptions,
and worker-backed path simplification remain the next performance layer.

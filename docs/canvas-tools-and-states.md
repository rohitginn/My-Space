# Canvas tools and interaction states

The React surface routes pointer and keyboard input through `CanvasEditor`
actions. The document is never mutated directly by toolbar components.

```text
select idle -> shape drag / marquee / handle transform
draw idle -> collect points -> RAF preview -> finalize
text idle -> contenteditable overlay -> commit/cancel
pan idle -> camera pan
eraser idle -> hit test -> delete unlocked shape
touch -> one-finger pan or two-finger pinch
```

Frames and groups use `parentId`. Frame children inherit containment on create,
move with the parent, and are clipped during rendering. Binding updates are
recomputed in the editor transaction layer.

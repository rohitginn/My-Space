# Canvas shapes

The shape registry currently covers:

- Geometry: rectangle, ellipse, diamond, triangle, hexagon, octagon, cloud,
  parallelogram, trapezoid, cylinder, callout.
- Drawing: pen, highlighter, line, arrow.
- Text: standalone rich text and sticky notes.
- Structure: groups and frames.
- Media: image, video, bookmark, and embed placement records.

Each registered shape has creation defaults and geometry integration. Renderers
remain SVG/HTML based; media uses HTML overlays where playback is required.

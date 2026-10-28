# `src/util`

Utility modules providing SVG element positioning, layout math, and error handling.

## Files

- [`svg.ts`](./svg.ts) - SVG component wrapper and layout positioning helper functions.
- [`misc.ts`](./misc.ts) - General error handling utilities.

---

## Major Interfaces & Classes

### `Component<E extends svgjs.Element>`

A wrapper around an SVG.js element that tracks element margins and provides convenient bounding-box geometry and positioning.

- **Properties**:
  - `element: E`: The wrapped SVG.js element.
  - `margin: number`: Surrounding margin applied during flow layout.
  - `width: number`: Bounding box width (`element.bbox().width`).
  - `height: number`: Bounding box height (`element.bbox().height`).
- **Methods**:
  - `move({ x, y, cx, cy }): void`: Repositions the wrapped element by its top-left coordinates (`x`, `y`) or center coordinates (`cx`, `cy`).
  - `static wrap<E>(element: E, { margin }: { margin: number }): Component<E>`: Factory method to wrap an SVG element.

### Helper Functions

#### `move(element: svgjs.Element, { x, y, cx, cy }): void`

Moves an SVG element based on optional target coordinates (`x`, `y` for top-left or `cx`, `cy` for center). Automatically computes delta displacements (`dx`, `dy`) and rounds displacements to sub-pixel accuracy using `roundPixels()`.

#### `roundPixels(n: number, { up }?: { up?: boolean }): number`

Rounds a pixel dimension or coordinate to one decimal place (`Math.round(n * 10) / 10`). If `up` is true, biases upward by adding `0.499` before rounding.

#### `failWith(errorMessage: string | (() => string)): never`

Unconditionally throws an `Error` with the given message string or lazy message supplier. Used for non-null assertions and unexpected states.

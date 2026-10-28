# `src/slides`

Slide lifecycle management and keyboard-driven step-by-step animations for [reveal.js](https://revealjs.com).

## Files

- [`slide.ts`](./slide.ts) - Slide registration and Reveal.js event hooks.
- [`motion.ts`](./motion.ts) - Step-by-step in-slide keyboard navigation and transition orchestration.

---

## Major Interfaces & Functions

### `interface Slide`

Represents an active slide that responds to visibility transitions.

```typescript
export interface Slide {
  /** Called when the slide becomes visible. */
  onShowSlide(): void;
  /** Called when navigating away from the slide. */
  onHideSlide(): void;
}
```

### `addSlide(sectionId: string, callback: (section: HTMLElement) => Slide): void`

Registers a factory callback to instantiate a `Slide` controller for a `<section id="...">` DOM element.

- Must be invoked **before** `Reveal.initialize()`.
- Slide creation is deferred until the Reveal `ready` event fires and confirms the DOM element is connected (supporting dynamically hidden/visible slides).

### `enableMotion(callback: (index: number) => boolean): void`

Enables step-by-step interactive animations within the current slide in response to keyboard arrow keys:

- Intended to be called inside `Slide.onShowSlide()`.
- **Right Arrow**: Invokes `callback(++index)` with 1-based step indices. When `callback` returns `false` (no more transitions), right arrow keybinding reverts to navigating to the next Reveal slide (`"next"`), and the right navigation control is highlighted.
- **Left Arrow**: If pressed during motion, resets the current slide by calling `callback(0)` and re-binds the left arrow to navigate to the previous slide (`"prev"`).

### Constants & Events

- `RIGHT_ARROW_KEY` (`39`), `LEFT_ARROW_KEY` (`37`): Key codes used for custom Reveal keybinding overrides.
- Custom event type declarations augmenting `ElementEventMap` for Reveal's `ready` and `slidechanged` events.

import * as svgjs from "@svgdotjs/svg.js";

export class Component<E extends svgjs.Element> {
  readonly margin: number;

  constructor(
    readonly element: E,
    { margin }: { margin: number },
  ) {
    this.margin = margin;
  }

  get width(): number {
    return this.element.bbox().width;
  }

  get height(): number {
    return this.element.bbox().height;
  }

  move({
    x,
    y,
    cx,
    cy,
  }: {
    x?: number;
    y?: number;
    cx?: number;
    cy?: number;
  }): void {
    move(this.element, { x: x, y: y, cx: cx, cy: cy });
  }

  static wrap<E extends svgjs.Element>(
    element: E,
    { margin }: { margin: number },
  ): Component<E> {
    return new Component<E>(element, { margin: margin });
  }
}

export function move(
  element: svgjs.Element,
  { x, y, cx, cy }: { x?: number; y?: number; cx?: number; cy?: number },
): void {
  const bbox = element.bbox();
  let dx = 0;
  let dy = 0;
  if (cx !== undefined) {
    x = cx - bbox.width / 2;
  }
  if (x !== undefined) {
    dx = roundPixels(x - bbox.x);
  }
  if (cy !== undefined) {
    y = cy - bbox.height / 2;
  }
  if (y !== undefined) {
    dy = roundPixels(y - bbox.y);
  }
  if (dx || dy) {
    element.dmove(dx, dy);
  }
}

export function roundPixels(n: number, { up }: { up?: boolean } = {}): number {
  if (up) {
    n += 0.499;
  }
  return Math.round(n * 10) / 10;
}

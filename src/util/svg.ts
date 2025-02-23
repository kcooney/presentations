import * as svgjs from "@svgdotjs/svg.js";

interface SizeLike {
  height: number;
  width: number;
}

export class SvgComponent<E extends svgjs.Element> {
  public readonly margin: number;
  private _size: SizeLike | undefined;

  constructor(
    readonly element: E,
    { margin }: { margin?: number } = {},
  ) {
    this.margin = margin ?? 0;
  }

  public addTo(parent: svgjs.Dom | HTMLElement | string, i?: number): this {
    this.element.addTo(parent, i);
    return this;
  }

  public remove(): void {
    this.element.remove();
  }

  public get width(): number {
    return this.size().width;
  }

  public get height(): number {
    return this.size().height;
  }

  private size() {
    this._size = this._size ?? this.element.bbox();
    return this._size;
  }

  public move({
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
    const bbox = this.element.bbox();
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
      this.element.dmove(dx, dy);
    }
  }
}

export abstract class SvgContainer extends SvgComponent<svgjs.G> {
  constructor({ margin }: { margin?: number }) {
    super(new svgjs.G(), { margin: margin });
  }
}

export function roundPixels(n: number, { up }: { up?: boolean } = {}): number {
  if (up) {
    n += 0.499;
  }
  return Math.round(n * 10) / 10;
}

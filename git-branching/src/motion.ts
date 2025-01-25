import Reveal from "reveal.js";

const RIGHT_ARROW_KEY = 39;
const LEFT_ARROW_KEY = 37;

let receivedReadyEvent = false;
const slides = new Map<string, Slide>();

type Initializer = () => Slide | null;

const initializers = new Map<string, Initializer>();

interface ReadyEvent extends Event {
  currentSlide: HTMLElement;
  indexh: number;
  indexy: number;
}

interface SlideChangedEvent extends Event {
  previousSlide: HTMLElement;
  currentSlide: HTMLElement;
  indexh: number;
  indexy: number;
}

declare global {
  interface ElementEventMap {
    ready: ReadyEvent;
    slidechanged: SlideChangedEvent;
  }
}

export interface Slide {
  onShowSlide(): void;
  onHideSlide(): void;
}

export function addSlide(
  sectionId: string,
  callback: (section: HTMLElement) => Slide,
) {
  if (receivedReadyEvent) {
    throw new Error("Cannot call addSlide() after Reveal.initialize()");
  }
  const element = document.getElementById(sectionId);
  if (!element) {
    throw new Error(`No element with ID '${sectionId}'`);
  }

  // If the slide has data-visibility="hidden" it may be removed by Reveal
  // when Reveal.initialize() is called, so we need to make sure it is
  // connected to the DOM before calling the callback.
  const initializer = () => {
    if (element.isConnected) {
      return callback(element);
    }
    return null;
  };

  initializers.set(sectionId, initializer);
}

export function enableMotion(callback: (index: number) => boolean) {
  let index = 0;
  Reveal.addKeyBinding(RIGHT_ARROW_KEY, () => {
    // If left pressed, slide resets, and next left goes to prev slide.
    Reveal.addKeyBinding(LEFT_ARROW_KEY, () => {
      Reveal.addKeyBinding(LEFT_ARROW_KEY, "prev");
      index = 0;
      callback(index);
    });
    const hasMoreTransitions = callback(++index);
    if (!hasMoreTransitions) {
      Reveal.addKeyBinding(RIGHT_ARROW_KEY, "next");

      // Animate the right arrow (to indicate there are no more transitions).
      const controls = document.getElementsByTagName("aside")[0];
      const nav = controls?.querySelector(".navigate-right");
      nav?.classList.add("highlight");
    }
  });
}

Reveal.on("slidechanged", (event: SlideChangedEvent) => {
  Reveal.addKeyBinding(RIGHT_ARROW_KEY, "next");
  Reveal.addKeyBinding(LEFT_ARROW_KEY, "prev");
  slides.get(event.previousSlide.id)?.onHideSlide();
  slides.get(event.currentSlide.id)?.onShowSlide();
});

Reveal.on("ready", (event: ReadyEvent) => {
  receivedReadyEvent = true;
  initializers.forEach((initializer, sectionId) => {
    const slide = initializer();
    if (slide !== null) {
      slides.set(sectionId, slide);
    }
  });
  slides.get(event.currentSlide.id)?.onShowSlide();
});

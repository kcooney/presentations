import Reveal from "reveal.js";

export const RIGHT_ARROW_KEY = 39;
export const LEFT_ARROW_KEY = 37;

let receivedReadyEvent = false;
const slides = new Map<string, Slide>();

type Initializer = () => Slide | null;

const initializers = new Map<string, Initializer>();

export interface Slide {
  onShowSlide(): void;
  onHideSlide(): void;
}

/**
 * Adds a slide to the current deck.
 *
 * Cannot be called after `Reveal.initialize()`.
 *
 * @param sectionId DOM ID for the section element of the slide.
 * @param callback Called once to create the slide.
 */
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

Reveal.on("slidechanged", (event: SlideChangedEvent) => {
  Reveal.addKeyBinding(RIGHT_ARROW_KEY, "next");
  Reveal.addKeyBinding(LEFT_ARROW_KEY, "prev");
  slides.get(event.previousSlide.id)?.onHideSlide();
  slides.get(event.currentSlide.id)?.onShowSlide();
});

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

// Make typescript aware of Reveal's custom events.
declare global {
  interface ElementEventMap {
    ready: ReadyEvent;
    slidechanged: SlideChangedEvent;
  }
}

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

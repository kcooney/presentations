import Reveal from 'reveal.js';

const RIGHT_ARROW_KEY = 39;
const LEFT_ARROW_KEY = 37;

type Slides = {
  [key: string] : Slide;
};
const slides: Slides = {};

type Initializer = (section: HTMLElement) => Slide;

type Initializers = {
    [key: string] : Initializer;
  };
const initializers: Initializers = {};

interface ReadyEvent extends Event {
    currentSlide: HTMLElement
    indexh: number
    indexy: number
}

interface SlideChangedEvent extends Event {
    previousSlide: HTMLElement
    currentSlide: HTMLElement
    indexh: number
    indexy: number
}

declare global {
    interface ElementEventMap {
        "ready": ReadyEvent;
        "slidechanged": SlideChangedEvent;
    }
}


export interface Slide {
    onShowSlide(): void;
    onHideSlide(): void;
};

export function addSlide(sectionId: string, callback: (section: HTMLElement) => Slide) {
    if (slides.length) {
        throw new Error("Cannot call addSlide() after ReadyEvent")
    }
    initializers[sectionId] = callback;
}

export function enableMotion(callback: (index: number) => boolean) {
    let index = 0;
    Reveal.addKeyBinding(RIGHT_ARROW_KEY, () => {
        // If left pressed, slide resets, and next left goes to prev slide.
        Reveal.addKeyBinding(LEFT_ARROW_KEY, () => {
            Reveal.addKeyBinding(LEFT_ARROW_KEY, 'prev');
            index = 0;
            callback(index);
        });
        const hasMoreTransitions = callback(++index);
        if (!hasMoreTransitions) {
            Reveal.addKeyBinding(RIGHT_ARROW_KEY, 'next');
        }
    });
}

Reveal.on("slidechanged", (event: SlideChangedEvent) => {
    Reveal.addKeyBinding(RIGHT_ARROW_KEY, "next");
    Reveal.addKeyBinding(LEFT_ARROW_KEY, "prev");
    if (event.previousSlide.id in slides) {
        slides[event.previousSlide.id].onHideSlide();
    }
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});

Reveal.on("ready", (event: ReadyEvent) => {
    for (const sectionId in initializers) {
        const element = document.getElementById(sectionId)
        if (!element) {
            throw new Error(`No element with ID '${sectionId}'`)
        }
        slides[sectionId] = initializers[sectionId](element);
    }
    if (event.currentSlide.id in slides) {
        slides[event.currentSlide.id].onShowSlide();
    }
});
